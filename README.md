# Linux-Namespace-Isolation-Manager

Conception, développent et déploiement Web-based Linux Namespace Isolation Manager

Objectif
Créer une interface web sécurisée permettant de créer et gérer des environnements isolés avec namespaces

1. Création d’environnement isolé
Depuis le navigateur : bouton “Créer sandbox” et le backend exécute
2.Isolation visible
L’utilisateur doit pouvoir voir :
PID isolés (ps) 
hostname différent 
réseau isolé
3. Terminal web 
Interface type : exécution de commandes, affichage stdout
4. Destruction de sandbox

# Partie ATTACK
Scénario :
Service web tourne en root  
L’équipe exploite :
injection commande 
accès host 
Escalade hors namespace
              
# Partie DEFENSE 
L’équipe doit corriger :
1. supprimer root: utiliser user namespace 
2. limiter commandes: whitelist 
3. sécuriser exécution

