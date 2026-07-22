import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import api from "../services/api";
import FileUpload from "../components/shared/FileUpload";

/* ──────────────────────────────────────────────
   Types locaux
   ────────────────────────────────────────────── */
interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  cin: string;
  clubName: string;
  clubAddress: string;
}

interface Docs {
  demandeInscription: string;
  contratTravail: string;
  attestationBlackBelt: string;
  attestationCoaching: string;
  copieJORT: string;
  assuranceClub: string;
}

const STEP_LABELS = [
  "Informations personnelles",
  "Informations du club",
  "Documents requis",
  "Récapitulatif",
];

/* ──────────────────────────────────────────────
   Validation helpers
   ────────────────────────────────────────────── */
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/* ──────────────────────────────────────────────
   Composant
   ────────────────────────────────────────────── */
export default function ClubAffiliation(): React.ReactElement {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    cin: "",
    clubName: "",
    clubAddress: "",
  });

  const [docs, setDocs] = useState<Docs>({
    demandeInscription: "",
    contratTravail: "",
    attestationBlackBelt: "",
    attestationCoaching: "",
    copieJORT: "",
    assuranceClub: "",
  });

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  /* ─── validation à chaque étape ─── */
  function validateStep(s: number): string | null {
    if (s === 0) {
      if (
        !form.firstName.trim() ||
        !form.lastName.trim() ||
        !form.email.trim() ||
        !form.password ||
        !form.confirmPassword ||
        !form.cin.trim()
      ) {
        return "Tous les champs sont obligatoires.";
      }
      if (!isValidEmail(form.email)) {
        return "Adresse email invalide.";
      }
      if (form.password.length < 8) {
        return "Le mot de passe doit contenir au moins 8 caractères.";
      }
      if (form.password !== form.confirmPassword) {
        return "Les mots de passe ne correspondent pas.";
      }
    }
    if (s === 1) {
      if (!form.clubName.trim() || !form.clubAddress.trim()) {
        return "Tous les champs sont obligatoires.";
      }
    }
    if (s === 2) {
      if (
        !docs.demandeInscription ||
        !docs.contratTravail ||
        !docs.attestationBlackBelt ||
        !docs.attestationCoaching ||
        !docs.copieJORT ||
        !docs.assuranceClub
      ) {
        return "Veuillez télécharger tous les documents requis.";
      }
    }
    return null;
  }

  const handleNext = () => {
    const err = validateStep(step);
    if (err) {
      toast.error(err);
      return;
    }
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  /* ─── soumission finale ─── */
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post("/auth/register/club-owner", {
        email: form.email,
        password: form.password,
        clubName: form.clubName,
        clubAddress: form.clubAddress,
        cin: form.cin,
        firstName: form.firstName,
        lastName: form.lastName,
        documents: docs,
      });
      toast.success("Votre demande a été soumise pour validation.");
      navigate("/login");
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Erreur lors de l'envoi de la demande.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  /* ──────────────────────────────────────────────
     Styles partagés
     ────────────────────────────────────────────── */
  const inputStyle: React.CSSProperties = {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    borderRadius: 12,
    padding: "12px 14px",
    fontSize: "0.95rem",
    width: "100%",
  };

  const labelStyle: React.CSSProperties = {
    display: "grid",
    gap: 7,
    fontWeight: 700,
    fontSize: "0.85rem",
    color: "var(--muted)",
  };

  const btnPrimaryStyle: React.CSSProperties = {
    padding: "13px 26px",
    fontSize: "0.9rem",
    fontWeight: 800,
    background: "linear-gradient(135deg, var(--red), #9c1119)",
    border: 0,
    borderRadius: 12,
    color: "#fff",
    cursor: "pointer",
    boxShadow: "0 8px 24px rgba(213,19,50,.3)",
  };

  const btnGhostStyle: React.CSSProperties = {
    padding: "12px 20px",
    fontSize: "0.9rem",
    fontWeight: 700,
    background: "transparent",
    border: "1px solid var(--border)",
    borderRadius: 12,
    color: "var(--muted)",
    cursor: "pointer",
  };

  /* ─── indicateur d'étape ─── */
  const stepIndicator = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        marginBottom: 32,
      }}
    >
      {STEP_LABELS.map((label, i) => {
        const isActive = i === step;
        const isDone = i < step;
        const circleBg = isActive
          ? "var(--red)"
          : isDone
            ? "var(--green)"
            : "var(--border)";
        return (
          <React.Fragment key={i}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  backgroundColor: circleBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isActive || isDone ? "#fff" : "var(--muted)",
                  fontWeight: 800,
                  fontSize: "0.85rem",
                  transition: "background .3s",
                }}
              >
                {isDone ? "✓" : i + 1}
              </div>
              <span
                style={{
                  fontSize: "0.7rem",
                  color: isActive ? "white" : "var(--muted)",
                  fontWeight: isActive ? 700 : 400,
                  textAlign: "center",
                  maxWidth: 80,
                  lineHeight: 1.3,
                }}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  background: i < step ? "var(--green)" : "var(--border)",
                  maxWidth: 50,
                  alignSelf: "flex-start",
                  marginTop: 16,
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  /* ─── barre de progression ─── */
  const progressPct = ((step + 1) / STEP_LABELS.length) * 100;
  const progressBar = (
    <div
      style={{
        height: 6,
        borderRadius: 3,
        background: "var(--border)",
        marginBottom: 32,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progressPct}%`,
          background: "linear-gradient(90deg, var(--red), var(--gold))",
          borderRadius: 3,
          transition: "width .4s ease",
        }}
      />
    </div>
  );

  /* ─── rendu de l'étape courante ─── */
  const renderStep = () => {
    switch (step) {
      /* ─── Étape 0 : Informations personnelles ─── */
      case 0:
        return (
          <div style={{ display: "grid", gap: 16 }}>
            <label style={labelStyle}>
              Prénom
              <input
                style={inputStyle}
                type="text"
                value={form.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
                placeholder="Votre prénom"
              />
            </label>
            <label style={labelStyle}>
              Nom
              <input
                style={inputStyle}
                type="text"
                value={form.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
                placeholder="Votre nom"
              />
            </label>
            <label style={labelStyle}>
              Adresse email
              <input
                style={inputStyle}
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="exemple@email.com"
              />
            </label>
            <label style={labelStyle}>
              Mot de passe
              <input
                style={inputStyle}
                type="password"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder="Minimum 8 caractères"
              />
            </label>
            <label style={labelStyle}>
              Confirmer le mot de passe
              <input
                style={inputStyle}
                type="password"
                value={form.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                placeholder="Répétez le mot de passe"
              />
            </label>
            <label style={labelStyle}>
              N° CIN
              <input
                style={inputStyle}
                type="text"
                value={form.cin}
                onChange={(e) => updateField("cin", e.target.value)}
                placeholder="Numéro de la carte d'identité nationale"
              />
            </label>
          </div>
        );

      /* ─── Étape 1 : Informations du club ─── */
      case 1:
        return (
          <div style={{ display: "grid", gap: 16 }}>
            <label style={labelStyle}>
              Nom du club
              <input
                style={inputStyle}
                type="text"
                value={form.clubName}
                onChange={(e) => updateField("clubName", e.target.value)}
                placeholder="Nom officiel du club"
              />
            </label>
            <label style={labelStyle}>
              Adresse du club
              <textarea
                style={{ ...inputStyle, minHeight: 100, resize: "vertical" }}
                value={form.clubAddress}
                onChange={(e) => updateField("clubAddress", e.target.value)}
                placeholder="Adresse complète du siège du club"
              />
            </label>
          </div>
        );

      /* ─── Étape 2 : Documents requis ─── */
      case 2:
        return (
          <div style={{ display: "grid", gap: 24 }}>
            <FileUpload
              light
              label="Demande d'inscription"
              accept=".pdf,.jpg,.jpeg,.png"
              maxSizeMB={10}
              currentUrl={docs.demandeInscription || null}
              onUploaded={(url) =>
                setDocs((prev) => ({ ...prev, demandeInscription: url }))
              }
            />
            <FileUpload
              light
              label="Contrat du travail signé"
              accept=".pdf,.jpg,.jpeg,.png"
              maxSizeMB={10}
              currentUrl={docs.contratTravail || null}
              onUploaded={(url) =>
                setDocs((prev) => ({ ...prev, contratTravail: url }))
              }
            />
            <FileUpload
              light
              label="Attestation de Grade"
              accept=".pdf,.jpg,.jpeg,.png"
              maxSizeMB={10}
              currentUrl={docs.attestationBlackBelt || null}
              onUploaded={(url) =>
                setDocs((prev) => ({ ...prev, attestationBlackBelt: url }))
              }
            />
            <FileUpload
              light
              label="Attestation de Grade d'Entreneur"
              accept=".pdf,.jpg,.jpeg,.png"
              maxSizeMB={10}
              currentUrl={docs.attestationCoaching || null}
              onUploaded={(url) =>
                setDocs((prev) => ({ ...prev, attestationCoaching: url }))
              }
            />
            <FileUpload
              light
              label="Registre National pour les Clubs RNE / Copie الرائد الرسمي للجمعية"
              accept=".pdf,.jpg,.jpeg,.png"
              maxSizeMB={10}
              currentUrl={docs.copieJORT || null}
              onUploaded={(url) =>
                setDocs((prev) => ({ ...prev, copieJORT: url }))
              }
            />
            <FileUpload
              light
              label="Assurance Club / Association"
              accept=".pdf,.jpg,.jpeg,.png"
              maxSizeMB={10}
              currentUrl={docs.assuranceClub || null}
              onUploaded={(url) =>
                setDocs((prev) => ({ ...prev, assuranceClub: url }))
              }
            />
          </div>
        );

      /* ─── Étape 3 : Récapitulatif ─── */
      case 3:
        return (
          <div style={{ display: "grid", gap: 20 }}>
            <div
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 20,
              }}
            >
              <h3
                style={{
                  color: "var(--text)",
                  margin: "0 0 12px",
                  fontSize: "1rem",
                }}
              >
                Informations personnelles
              </h3>
              <p
                className="muted"
                style={{ margin: "4px 0", fontSize: "0.9rem" }}
              >
                <strong style={{ color: "var(--text)" }}>Nom :</strong>{" "}
                {form.firstName} {form.lastName}
              </p>
              <p
                className="muted"
                style={{ margin: "4px 0", fontSize: "0.9rem" }}
              >
                <strong style={{ color: "var(--text)" }}>Email :</strong>{" "}
                {form.email}
              </p>
              <p
                className="muted"
                style={{ margin: "4px 0", fontSize: "0.9rem" }}
              >
                <strong style={{ color: "var(--text)" }}>CIN :</strong>{" "}
                {form.cin}
              </p>
            </div>

            <div
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 20,
              }}
            >
              <h3
                style={{
                  color: "var(--text)",
                  margin: "0 0 12px",
                  fontSize: "1rem",
                }}
              >
                Informations du club
              </h3>
              <p
                className="muted"
                style={{ margin: "4px 0", fontSize: "0.9rem" }}
              >
                <strong style={{ color: "var(--text)" }}>Club :</strong>{" "}
                {form.clubName}
              </p>
              <p
                className="muted"
                style={{ margin: "4px 0", fontSize: "0.9rem" }}
              >
                <strong style={{ color: "var(--text)" }}>Adresse :</strong>{" "}
                {form.clubAddress}
              </p>
            </div>

            <div
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 20,
              }}
            >
              <h3
                style={{
                  color: "var(--text)",
                  margin: "0 0 12px",
                  fontSize: "1rem",
                }}
              >
                Documents joints
              </h3>
              <ul
                style={{
                  paddingLeft: 18,
                  margin: 0,
                  color: "var(--muted)",
                  fontSize: "0.9rem",
                  lineHeight: 1.8,
                }}
              >
                <li>
                  Demande d'inscription :{" "}
                  {docs.demandeInscription ? "✅" : "❌"}
                </li>
                <li>
                  Contrat du travail signé : {docs.contratTravail ? "✅" : "❌"}
                </li>
                <li>
                  Attestation Black belt 1ère degré :{" "}
                  {docs.attestationBlackBelt ? "✅" : "❌"}
                </li>
                <li>
                  Attestation fédérale Coaching :{" "}
                  {docs.attestationCoaching ? "✅" : "❌"}
                </li>
                <li>Copie الرائد الرسمي : {docs.copieJORT ? "✅" : "❌"}</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  /* ──────────────────────────────────────────────
     Rendu principal
     ────────────────────────────────────────────── */
  return (
    <div className="page" style={{ maxWidth: 720, margin: "36px auto" }}>
      <div
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "40px 36px",
          boxShadow: "0 20px 60px rgba(0,0,0,.45)",
        }}
      >
        <h2
          style={{
            color: "white",
            fontSize: "1.5rem",
            fontWeight: 800,
            textAlign: "center",
            margin: "0 0 8px",
          }}
        >
          Demande d'affiliation
        </h2>
        <p
          className="muted"
          style={{
            textAlign: "center",
            margin: "0 0 28px",
            fontSize: "0.9rem",
            color: "white",
          }}
        >
          Enregistrez votre club auprès de la Fédération Tunisienne de Jiu-Jitsu
        </p>

        {/* Progression */}
        {progressBar}
        {stepIndicator}

        {/* Contenu de l'étape */}
        <div style={{ marginBottom: 28 }}>{renderStep()}</div>

        {/* Boutons navigation */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>
            {step > 0 && (
              <button type="button" style={btnGhostStyle} onClick={handleBack}>
                ← Retour
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            {step < 3 ? (
              <button
                type="button"
                style={btnPrimaryStyle}
                onClick={handleNext}
              >
                Suivant →
              </button>
            ) : (
              <button
                type="button"
                style={btnPrimaryStyle}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Envoi en cours..." : "Confirmer et envoyer"}
              </button>
            )}
          </div>
        </div>

        {step === 0 && (
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <Link
              to="/login"
              style={{
                color: "var(--muted)",
                fontSize: "0.85rem",
                textDecoration: "underline",
              }}
            >
              Déjà un compte ? Se connecter
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
