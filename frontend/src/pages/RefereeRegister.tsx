import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import FileUpload from "../components/shared/FileUpload";
import { toast } from "sonner";

export default function RefereeRegister(): React.ReactElement {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nationality, setNationality] = useState("Tunisienne");
  const [gender, setGender] = useState("MALE");
  const [identityDocumentType, setIdentityDocumentType] = useState("CIN");

  const [identityDocumentUrl, setIdentityDocumentUrl] = useState("");
  const [birthCertificateUrl, setBirthCertificateUrl] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [refereeDegreeAttestationUrl, setRefereeDegreeAttestationUrl] =
    useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (
      !email.trim() ||
      !password.trim() ||
      !firstName.trim() ||
      !lastName.trim() ||
      !dateOfBirth
    ) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/auth/register-referee", {
        email,
        password,
        firstName,
        lastName,
        dateOfBirth,
        nationality,
        gender,
        identityDocumentType,
        identityDocumentUrl: identityDocumentUrl || undefined,
        birthCertificateUrl: birthCertificateUrl || undefined,
        photoUrl: photoUrl || undefined,
        refereeDegreeAttestationUrl:
          refereeDegreeAttestationUrl || undefined,
      });
      setSuccess(true);
      toast.success("Demande soumise avec succès !");
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Erreur lors de l'inscription";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    color: "black",
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

  if (success) {
    return (
      <div className="page auth-page">
        <div
          className="auth-card"
          style={{
            background: "var(--panel)",
            borderRadius: 16,
            padding: "40px 36px",
            width: "min(500px, 100%)",
            border: "1px solid var(--border)",
            boxShadow: "0 20px 60px rgba(0,0,0,.45)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "3rem",
              marginBottom: 16,
            }}
          >
            ✅
          </div>
          <h2
            style={{
              color: "white",
              fontSize: "1.4rem",
              fontWeight: 800,
              margin: "0 0 12px",
            }}
          >
            Demande soumise !
          </h2>
          <p
            style={{
              color: "var(--muted)",
              fontSize: "0.95rem",
              lineHeight: 1.6,
              marginBottom: 24,
            }}
          >
            Votre demande d'inscription a été soumise. Elle sera examinée par
            l'administration. Vous recevrez un email dès que votre compte sera
            validé.
          </p>
          <Link
            to="/login"
            style={{
              color: "var(--red)",
              fontWeight: 700,
              textDecoration: "underline",
            }}
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page auth-page">
      <div
        className="auth-card"
        style={{
          background: "var(--panel)",
          borderRadius: 16,
          padding: "40px 36px",
          width: "min(540px, 100%)",
          border: "1px solid var(--border)",
          boxShadow: "0 20px 60px rgba(0,0,0,.45)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h2
            style={{
              color: "white",
              fontSize: "1.6rem",
              margin: "0 0 8px",
              fontWeight: 800,
            }}
          >
            Inscription Arbitre FTJJ
          </h2>
          <p
            className="muted"
            style={{ fontSize: "0.9rem", margin: 0, color: "white" }}
          >
            Créez votre compte arbitre (en attente de validation)
          </p>
        </div>

        {error && (
          <div
            className="alert"
            style={{
              background: "rgba(213,19,50,.18)",
              color: "var(--red)",
              border: "1px solid rgba(213,19,50,.3)",
              padding: 12,
              borderRadius: 12,
              marginBottom: 20,
              fontSize: "0.88rem",
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "grid", gap: 16, maxHeight: "70vh", overflowY: "auto", paddingRight: 8 }}
        >
          <label style={labelStyle}>
            Adresse email *
            <input
              type="email"
              placeholder="exemple@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Mot de passe *
            <input
              type="password"
              placeholder="6 caractères minimum"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Prénom *
            <input
              type="text"
              placeholder="Votre prénom"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Nom *
            <input
              type="text"
              placeholder="Votre nom de famille"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Date de naissance *
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              required
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Nationalité
            <input
              type="text"
              placeholder="Tunisienne"
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Genre *
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              required
              style={inputStyle}
            >
              <option value="MALE">Homme</option>
              <option value="FEMALE">Femme</option>
            </select>
          </label>

          <label style={labelStyle}>
            Type de pièce d'identité *
            <select
              value={identityDocumentType}
              onChange={(e) => setIdentityDocumentType(e.target.value)}
              required
              style={inputStyle}
            >
              <option value="CIN">Carte d'identité nationale (CIN)</option>
              <option value="BIRTH_CERTIFICATE">Extrait de naissance</option>
            </select>
          </label>

          <FileUpload
            label="Pièce d'identité (PDF/Image)"
            accept=".pdf,.jpg,.jpeg,.png"
            onUploaded={setIdentityDocumentUrl}
            currentUrl={identityDocumentUrl || null}
            hint="Copie de votre CIN ou extrait de naissance"
          />

          <FileUpload
            label="Extrait de naissance (PDF/Image)"
            accept=".pdf,.jpg,.jpeg,.png"
            onUploaded={setBirthCertificateUrl}
            currentUrl={birthCertificateUrl || null}
            hint="Optionnel"
          />

          <FileUpload
            label="Photo d'identité"
            accept=".jpg,.jpeg,.png"
            onUploaded={setPhotoUrl}
            currentUrl={photoUrl || null}
            hint="Photo portrait récente"
          />

          <FileUpload
            label="Attestation de degré d'arbitrage (PDF/Image)"
            accept=".pdf,.jpg,.jpeg,.png"
            onUploaded={setRefereeDegreeAttestationUrl}
            currentUrl={refereeDegreeAttestationUrl || null}
            hint="Document certifiant votre qualification d'arbitre"
          />

          <button
            type="submit"
            className="btn primary"
            disabled={submitting}
            style={{
              marginTop: 4,
              padding: "13px 20px",
              fontSize: "0.95rem",
              fontWeight: 800,
              background: submitting
                ? "rgba(213,19,50,.5)"
                : "linear-gradient(135deg, var(--red), #9c1119)",
              border: 0,
              borderRadius: 12,
              color: "#fff",
              cursor: submitting ? "not-allowed" : "pointer",
              boxShadow: submitting ? "none" : "0 8px 24px rgba(213,19,50,.3)",
            }}
          >
            {submitting ? "Envoi en cours..." : "Soumettre ma demande"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link
            to="/login"
            style={{
              color: "var(--muted)",
              fontSize: "0.85rem",
              textDecoration: "underline",
            }}
          >
            Déjà inscrit ? Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
