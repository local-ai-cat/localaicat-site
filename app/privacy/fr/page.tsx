import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "../../_components/content-page";
import { SiteShell } from "../../_components/site-shell";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Local AI Cat conserve vos conversations, vos modèles et vos entrées vocales sur votre appareil. Découvrez ce que nous collectons et ne collectons pas."
};

export default function PrivacyPageFr() {
  return (
    <SiteShell navMode="legal">
      <ContentPage
        intro="Local AI Cat est conçu autour d'une IA exécutée sur l'appareil. Par défaut, vos conversations, vos modèles et vos entrées vocales restent sur votre propre matériel au lieu de transiter par nos serveurs."
        kicker="Confidentialité"
        meta="Dernière mise à jour : mars 2026"
        title="Politique de confidentialité"
        callout={
          <>
            <p>
              <strong>En bref :</strong> nous ne collectons, ne stockons ni ne
              transmettons vos conversations. Vos données restent sur votre
              appareil, sauf si vous choisissez explicitement un service
              optionnel fourni par Apple.
            </p>
            <p>
              Cette page est la version française. Read this page in{" "}
              <Link className="textLink" href="/privacy">
                English
              </Link>
              .
            </p>
          </>
        }
      >
        <section className="contentCard">
          <h2>Ce que nous ne collectons pas</h2>
          <ul>
            <li>Le contenu des discussions ou les conversations</li>
            <li>Les enregistrements vocaux ou les transcriptions</li>
            <li>
              Les informations personnelles pour l'usage principal de
              l'application
            </li>
            <li>Les statistiques de suivi liées à vos requêtes</li>
          </ul>
        </section>

        <div className="contentGrid">
          <section className="contentCard">
            <h2>Stockage local par défaut</h2>
            <p>
              L'application repose sur l'exécution locale des modèles et le
              stockage local. Si vous supprimez l'application, les données
              locales stockées par cette installation sont supprimées de cet
              appareil.
            </p>
          </section>

          <section className="contentCard">
            <h2>Services optionnels gérés par Apple</h2>
            <p>
              Si vous activez une amélioration fournie par Apple, telle que la
              transcription assistée par le cloud, ce traitement est régi par
              les conditions et les politiques de confidentialité d'Apple.
              Local AI Cat ne reçoit ni ne stocke cet audio.
            </p>
          </section>
        </div>

        <section className="contentCard">
          <h2>Téléchargement direct et facturation</h2>
          <p>
            Le parcours en téléchargement direct et professionnel peut
            introduire des enregistrements d'achat, de droits d'accès ou de
            facturation nécessaires à la gestion des abonnements, du mode
            Développeur, de l'accès Équipe ou du déploiement Entreprise. Ces
            enregistrements doivent se limiter à l'état commercial et aux droits
            d'accès, et non au contenu de vos discussions.
          </p>
        </section>

        <section className="contentCard">
          <h2>Licences open source</h2>
          <p>
            Local AI Cat utilise des bibliothèques open source. Consultez la
            liste complète sur notre page des{" "}
            <Link className="textLink" href="/licenses">
              licences tierces
            </Link>
            .
          </p>
        </section>

        <section className="contentCard">
          <h2>Questions</h2>
          <p>
            Pour toute question relative à la confidentialité, contactez{" "}
            <a className="textLink" href="mailto:privacy@localaicat.com">
              privacy@localaicat.com
            </a>
            .
          </p>
        </section>
      </ContentPage>
    </SiteShell>
  );
}
