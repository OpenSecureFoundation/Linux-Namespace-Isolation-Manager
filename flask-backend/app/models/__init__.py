import enum
import uuid
from datetime import datetime
from ..extensions import db


def _uuid() -> str:
    return str(uuid.uuid4())


class StatutSandbox(str, enum.Enum):
    EN_COURS = "EN_COURS"
    ARRETEE = "ARRETEE"
    EN_ERREUR = "EN_ERREUR"


# Types de namespaces sélectionnables par l'utilisateur (un seul à la fois).
# Voir helper/sandbox_helper.c — ns_flag().
TYPES_ISOLATION = ("MNT", "PID", "NET", "UTS")


class Utilisateur(db.Model):
    __tablename__ = "utilisateur"
    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    nom_systeme = db.Column(db.String(64), unique=True, nullable=False)
    uid_systeme = db.Column(db.Integer, nullable=False)
    date_derniere_connexion = db.Column(db.DateTime, default=datetime.utcnow)

    sandboxes = db.relationship("Sandbox", backref="proprietaire", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "nomSysteme": self.nom_systeme,
            "uidSysteme": self.uid_systeme,
            "dateDerniereConnexion": self.date_derniere_connexion.isoformat()
            if self.date_derniere_connexion else None,
        }


class Sandbox(db.Model):
    __tablename__ = "sandbox"
    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    nom_virtuel = db.Column(db.String(64), nullable=False)
    pid_racine = db.Column(db.Integer, nullable=True)
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)
    statut = db.Column(db.Enum(StatutSandbox), default=StatutSandbox.ARRETEE, nullable=False)
    # Type de namespace isolé (un seul par sandbox). Défaut MNT — voir UI.
    type_isolation = db.Column(db.String(8), nullable=False, default="MNT")
    proprietaire_id = db.Column(db.String(36), db.ForeignKey("utilisateur.id"), nullable=False)

    commandes = db.relationship(
        "Commande", backref="sandbox", lazy=True,
        cascade="all, delete-orphan", order_by="Commande.date_execution.desc()",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "nomVirtuel": self.nom_virtuel,
            "pidRacine": self.pid_racine,
            "dateCreation": self.date_creation.isoformat() if self.date_creation else None,
            "statut": self.statut.value,
            "typeIsolation": self.type_isolation,
            "proprietaireId": self.proprietaire_id,
        }


class Commande(db.Model):
    __tablename__ = "commande"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    texte_instruction = db.Column(db.Text, nullable=False)
    date_execution = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    resultat_sortie = db.Column(db.Text, default="")
    est_reussie = db.Column(db.Boolean, default=True)
    sandbox_id = db.Column(db.String(36), db.ForeignKey("sandbox.id"), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "texteInstruction": self.texte_instruction,
            "dateExecution": self.date_execution.isoformat() if self.date_execution else None,
            "resultatSortie": self.resultat_sortie,
            "estReussie": self.est_reussie,
            "sandboxId": self.sandbox_id,
        }
