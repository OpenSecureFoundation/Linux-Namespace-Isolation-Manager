/*
 * sandbox_helper — porte-drapeau des capabilities pour le service Flask.
 *
 * REFONTE : une sandbox n'isole plus qu'UN SEUL type de namespace à la fois,
 * choisi par l'utilisateur dans l'UI. Types supportés : mnt, pid, net, uts.
 * En mode DEFENSE on ajoute systématiquement CLONE_NEWUSER pour que le root
 * intra-sandbox soit mappé vers l'UID non-privilégié de l'utilisateur.
 *
 * Compilation :
 *   gcc -O2 -Wall -o sandbox_helper sandbox_helper.c
 *   sudo chown root:sandboxmgr sandbox_helper
 *   sudo chmod 750 sandbox_helper
 *   sudo setcap cap_setuid,cap_setgid,cap_sys_admin,cap_sys_chroot,cap_net_admin,cap_dac_override,cap_chown,cap_fowner,cap_sys_ptrace+ep sandbox_helper
 *
 * cap_sys_ptrace est nécessaire même si le helper ne fait pas de ptrace() :
 * ouvrir /proc/<pid>/ns/* d'un processus qui n'est pas un enfant direct de
 * l'appelant passe par la même vérification que PTRACE_MODE_READ. Sur les
 * distributions avec Yama ptrace_scope=1 (Ubuntu/Debian par défaut), sans
 * cette capability `exec` échoue avec "Permission denied" alors que `spawn`
 * réussit — cf. kernel.yama.ptrace_scope dans sysctl.
 *
 * Sous-commandes :
 *   useradd <username>                                 (mot de passe lu sur stdin)
 *   spawn   <mode> <ns_type> <uid> <hostname>          imprime "PID <n>" puis termine
 *   exec    <uid> <sandbox_pid> <ns_type> <argv...>    exécute dans le ns de sandbox_pid
 *   kill    <sandbox_pid>                              termine proprement la sandbox
 *
 * useradd : le helper n'a pas les droits pour écrire /etc/passwd même avec
 *   CAP_DAC_OVERRIDE (useradd contrôle euid==0). On délègue à sudo(8) avec
 *   une règle NOPASSWD ciblée — cf. README §2.
 */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sched.h>
#include <signal.h>
#include <sys/wait.h>
#include <sys/mount.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <errno.h>
#include <grp.h>
#include <pwd.h>

#define STACK_SIZE (1024 * 1024)

/* --------------------------------------------------------------------- */
static int is_valid_username(const char *s) {
    size_t n = strlen(s);
    if (n < 2 || n > 32) return 0;
    for (size_t i = 0; i < n; i++)
        if (!(('a'<=s[i]&&s[i]<='z')||('0'<=s[i]&&s[i]<='9'))) return 0;
    return 1;
}

static int write_file(const char *path, const char *data) {
    int fd = open(path, O_WRONLY);
    if (fd < 0) return -1;
    ssize_t n = write(fd, data, strlen(data));
    int e = errno;
    close(fd);
    if (n < 0) { errno = e; return -1; }
    return 0;
}

/* Traduit un nom de namespace en flag CLONE_NEW*. Renvoie 0 si inconnu. */
static int ns_flag(const char *name) {
    if (!strcmp(name, "mnt"))  return CLONE_NEWNS;
    if (!strcmp(name, "pid"))  return CLONE_NEWPID;
    if (!strcmp(name, "net"))  return CLONE_NEWNET;
    if (!strcmp(name, "uts"))  return CLONE_NEWUTS;
    return 0;
}

/* ---- useradd -------------------------------------------------------- */
/* useradd/chpasswd exigent euid==0 (verrous /etc/passwd, /etc/shadow).
 * Les CAP file capabilities ne suffisent pas. On passe par sudo(8) qui
 * DOIT être configuré NOPASSWD pour l'utilisateur sandboxmgr — cf. README. */
static int cmd_useradd(int argc, char **argv) {
    if (argc < 3 || !is_valid_username(argv[2])) {
        fprintf(stderr, "invalid username\n"); return 2;
    }
    char password[256] = {0};
    if (!fgets(password, sizeof(password), stdin)) {
        fprintf(stderr, "no password on stdin\n"); return 2;
    }
    pid_t pid = fork();
    if (pid == 0) {
        execl("/usr/bin/sudo", "sudo", "-n",
              "/usr/sbin/useradd", "-m", "-s", "/bin/bash", argv[2], (char*)NULL);
        _exit(127);
    }
    int st; waitpid(pid, &st, 0);
    if (!WIFEXITED(st) || WEXITSTATUS(st) != 0) {
        fprintf(stderr, "useradd failed (sudo NOPASSWD configuré ? cf README)\n");
        return 1;
    }

    int fds[2]; if (pipe(fds) < 0) return 1;
    pid = fork();
    if (pid == 0) {
        dup2(fds[0], 0); close(fds[0]); close(fds[1]);
        execl("/usr/bin/sudo", "sudo", "-n", "/usr/sbin/chpasswd", (char*)NULL);
        _exit(127);
    }
    close(fds[0]);
    dprintf(fds[1], "%s:%s", argv[2], password);
    close(fds[1]);
    waitpid(pid, &st, 0);
    return (WIFEXITED(st) && WEXITSTATUS(st) == 0) ? 0 : 1;
}

/* ---- spawn ---------------------------------------------------------- */
struct spawn_ctx {
    const char *mode;       /* "defense" | "attack" */
    const char *hostname;
    const char *ns_type;    /* "mnt" | "pid" | "net" | "uts" */
    uid_t       uid;
    int         ready_r;    /* le fils attend que le parent écrive uid_map/gid_map */
    int         ack_w;      /* le fils prévient le parent qu'il a fini son setup */
};

/*
 * Fonction exécutée par le processus cloné dans le nouveau namespace.
 * Devient l'init de la sandbox et reste vivant indéfiniment.
 */
static int sandbox_init(void *arg) {
    struct spawn_ctx *c = arg;
    char buf;

    /* 1. Attendre que le parent ait écrit uid_map / gid_map (user ns) */
    if (read(c->ready_r, &buf, 1) != 1) _exit(10);
    close(c->ready_r);

    /* 2. Le process cloné a TOUJOURS son propre mount namespace (CLONE_NEWNS
     * est ajouté inconditionnellement dans cmd_spawn), même quand le type
     * "isolé" choisi par l'utilisateur n'est pas mnt. On le rend privé
     * systématiquement : sans ça, un remount de /proc plus bas (cas "pid")
     * se propagerait vers l'hôte via les groupes de partage hérités et
     * modifierait /proc pour TOUTE la machine. */
    mount(NULL, "/", NULL, MS_REC | MS_PRIVATE, NULL);

    /* 3. Setup spécifique au type de namespace isolé */
    if (!strcmp(c->ns_type, "uts") && c->hostname && *c->hostname) {
        sethostname(c->hostname, strlen(c->hostname));
    }
    if (!strcmp(c->ns_type, "pid")) {
        /* Un /proc frais reflète le nouveau PID ns. */
        umount2("/proc", MNT_DETACH);
        mount("proc", "/proc", "proc",
              MS_NOSUID | MS_NODEV | MS_NOEXEC, NULL);
    }

    /* 4. Prévenir le parent qu'on est prêt puis boucler comme init. */
    write(c->ack_w, "1", 1);
    close(c->ack_w);

    /* Init doit reaper les zombies (les exec_in_sandbox forkent ici). */
    signal(SIGCHLD, SIG_IGN);

    /* Détacher stdin/stdout/stderr hérités du helper — sinon subprocess.run
     * côté Flask reste bloqué à lire les pipes → timeout. */
    int devnull = open("/dev/null", O_RDWR);
    if (devnull >= 0) {
        dup2(devnull, 0);
        dup2(devnull, 1);
        dup2(devnull, 2);
        if (devnull > 2) close(devnull);
    }

    for (;;) pause();
    return 0;
}

static int cmd_spawn(int argc, char **argv) {
    if (argc < 6) {
        fprintf(stderr, "usage: spawn <mode> <ns_type> <uid> <hostname>\n");
        return 2;
    }
    const char *mode    = argv[2];
    const char *ns_type = argv[3];
    long uid_l = strtol(argv[4], NULL, 10);
    if (uid_l < 1000 || uid_l > 65535) {
        fprintf(stderr, "invalid uid (must be >=1000)\n"); return 2;
    }
    uid_t uid = (uid_t)uid_l;
    const char *host = argv[5];
    int defense = (strcmp(mode, "defense") == 0);

    int one_flag = ns_flag(ns_type);
    if (!one_flag) {
        fprintf(stderr, "invalid ns_type '%s' (expected mnt|pid|net|uts)\n", ns_type);
        return 2;
    }

    int ready[2], ack[2];
    if (pipe(ready) < 0 || pipe(ack) < 0) { perror("pipe"); return 1; }

    struct spawn_ctx ctx = {
        .mode = mode, .hostname = host, .ns_type = ns_type, .uid = uid,
        .ready_r = ready[0], .ack_w = ack[1],
    };

    /* UN SEUL namespace applicatif "visible" côté pédagogie + USER en defense
     * pour dropper les privilèges. CLONE_NEWNS est toujours ajouté : c'est
     * un détail d'implémentation qui donne à la sandbox un mount namespace
     * privé, nécessaire pour que le remount de /proc (cas ns_type=pid) ne
     * touche jamais l'hôte. Il n'apparaît pas dans l'UI comme un type
     * d'isolation choisi. */
    int flags = SIGCHLD | one_flag | CLONE_NEWNS;
    if (defense) flags |= CLONE_NEWUSER;

    char *stack = malloc(STACK_SIZE);
    if (!stack) { perror("malloc"); return 1; }

    pid_t pid = clone(sandbox_init, stack + STACK_SIZE, flags, &ctx);
    if (pid < 0) { perror("clone"); return 1; }

    close(ready[0]);
    close(ack[1]);

    if (defense) {
        char path[128], line[64];
        snprintf(path, sizeof path, "/proc/%d/setgroups", pid);
        write_file(path, "deny");

        snprintf(path, sizeof path, "/proc/%d/uid_map", pid);
        snprintf(line, sizeof line, "0 %u 1\n", uid);
        if (write_file(path, line) < 0) perror(path);

        snprintf(path, sizeof path, "/proc/%d/gid_map", pid);
        snprintf(line, sizeof line, "0 %u 1\n", uid);
        if (write_file(path, line) < 0) perror(path);
    }

    write(ready[1], "1", 1);
    close(ready[1]);

    char b;
    if (read(ack[0], &b, 1) != 1) {
        fprintf(stderr, "sandbox init did not ack\n");
        kill(pid, SIGKILL);
        return 1;
    }
    close(ack[0]);

    printf("PID %d\n", pid);
    fflush(stdout);
    return 0;
}

/* ---- exec ----------------------------------------------------------- */
/*
 * setns() sur UNIQUEMENT le namespace choisi. On n'ouvre pas 'user' : les
 * noyaux modernes refusent setns(user) inter-processus (EPERM) même avec
 * CAP_SYS_ADMIN. Le user ns est hérité implicitement pour les namespaces
 * qui ont été créés en même temps que lui (mnt/pid/net/uts).
 */
static int cmd_exec(int argc, char **argv) {
    if (argc < 6) {
        fprintf(stderr, "usage: exec <uid> <sandbox_pid> <ns_type> <cmd...>\n");
        return 2;
    }
    long uid_l = strtol(argv[2], NULL, 10);
    long pid_l = strtol(argv[3], NULL, 10);
    const char *ns_type = argv[4];
    if (uid_l < 1000 || pid_l < 2) { fprintf(stderr, "invalid uid/pid\n"); return 2; }
    if (!ns_flag(ns_type)) {
        fprintf(stderr, "invalid ns_type '%s'\n", ns_type); return 2;
    }
    uid_t uid = (uid_t)uid_l;
    pid_t spid = (pid_t)pid_l;
    int is_pid_ns = (strcmp(ns_type, "pid") == 0);
    int is_mnt_ns = (strcmp(ns_type, "mnt") == 0);

    char path[128];
    snprintf(path, sizeof path, "/proc/%d/ns/%s", spid, ns_type);
    int fd = open(path, O_RDONLY | O_CLOEXEC);
    if (fd < 0) {
        fprintf(stderr, "open %s: %s\n", path, strerror(errno));
        return 1;
    }
    if (setns(fd, 0) < 0) {
        fprintf(stderr, "setns(%s): %s\n", ns_type, strerror(errno));
        close(fd); return 1;
    }
    close(fd);

    /* Cas "pid" : le remount de /proc plus bas doit se faire dans le mount
     * namespace PRIVÉ de la sandbox (créé par cmd_spawn via CLONE_NEWNS),
     * jamais dans celui, partagé, du process appelant — sinon on remonte
     * /proc pour la machine hôte entière. setns(mnt) prend effet
     * immédiatement (pas besoin d'attendre un fork). */
    if (is_pid_ns) {
        char mpath[128];
        snprintf(mpath, sizeof mpath, "/proc/%d/ns/mnt", spid);
        int mfd = open(mpath, O_RDONLY | O_CLOEXEC);
        if (mfd < 0) {
            fprintf(stderr, "open %s: %s\n", mpath, strerror(errno));
            return 1;
        }
        if (setns(mfd, 0) < 0) {
            fprintf(stderr, "setns(mnt): %s\n", strerror(errno));
            close(mfd); return 1;
        }
        close(mfd);
    }

    /* setns(PID) ne s'applique qu'aux enfants → fork() si on est dans le
     * cas pid. Pour les autres types on fork quand même pour uniformiser
     * (isolation propre du remount /proc éventuel). */
    pid_t child = fork();
    if (child < 0) { perror("fork"); return 1; }
    if (child == 0) {
        if (is_pid_ns || is_mnt_ns) {
            /* Remonter /proc pour que ps reflète le PID ns de la sandbox. */
            umount2("/proc", MNT_DETACH);
            mount("proc", "/proc", "proc",
                  MS_NOSUID | MS_NODEV | MS_NOEXEC, NULL);
        }

        struct passwd *pw = getpwuid(uid);
        if (pw) {
            initgroups(pw->pw_name, pw->pw_gid);
            if (setgid(pw->pw_gid) < 0) { perror("setgid"); _exit(126); }
        } else {
            setgroups(0, NULL);
            if (setgid(uid) < 0) { perror("setgid"); _exit(126); }
        }
        if (setuid(uid) < 0) { perror("setuid"); _exit(126); }

        execvp(argv[5], &argv[5]);
        fprintf(stderr, "execvp %s: %s\n", argv[5], strerror(errno));
        _exit(127);
    }
    int st;
    if (waitpid(child, &st, 0) < 0) { perror("waitpid"); return 1; }
    if (WIFEXITED(st))   return WEXITSTATUS(st);
    if (WIFSIGNALED(st)) return 128 + WTERMSIG(st);
    return 1;
}

/* ---- kill ----------------------------------------------------------- */
static int cmd_kill(int argc, char **argv) {
    if (argc < 3) { fprintf(stderr, "usage: kill <sandbox_pid>\n"); return 2; }
    long pid_l = strtol(argv[2], NULL, 10);
    if (pid_l < 2) { fprintf(stderr, "invalid pid\n"); return 2; }
    pid_t pid = (pid_t)pid_l;
    if (kill(pid, SIGTERM) < 0 && errno != ESRCH) {
        perror("kill"); return 1;
    }
    waitpid(pid, NULL, WNOHANG);
    return 0;
}

int main(int argc, char **argv) {
    if (argc < 2) { fprintf(stderr,"usage: %s <useradd|spawn|exec|kill> ...\n", argv[0]); return 2; }
    if (!strcmp(argv[1], "useradd")) return cmd_useradd(argc, argv);
    if (!strcmp(argv[1], "spawn"))   return cmd_spawn(argc, argv);
    if (!strcmp(argv[1], "exec"))    return cmd_exec(argc, argv);
    if (!strcmp(argv[1], "kill"))    return cmd_kill(argc, argv);
    fprintf(stderr,"unknown subcommand: %s\n", argv[1]);
    return 2;
}
