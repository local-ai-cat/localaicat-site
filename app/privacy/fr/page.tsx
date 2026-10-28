import { AnalyticsPreference } from "../../_components/site-analytics";
import type { Metadata } from "next";
import { getSiteUrl } from "../../../lib/env";
import { spaceSharingMetadata } from "../../../lib/space-sharing";
import Link from "next/link";
import { ContentPage } from "../../_components/content-page";
import { SiteShell } from "../../_components/site-shell";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Local AI Cat conserve vos conversations, vos modèles et vos entrées vocales sur votre appareil. Découvrez ce que nous collectons et ne collectons pas.",
  alternates: {
    canonical: "/privacy/fr",
    languages: { en: "/privacy", fr: "/privacy/fr", "x-default": "/privacy" }
  },
  // Next replaces openGraph as a whole, so the French card restates the shared artwork with its own locale.
  openGraph: { ...spaceSharingMetadata(getSiteUrl()).openGraph, locale: "fr_FR" }
};

export default function PrivacyPageFr() {
  return (
    <SiteShell>
      <div lang="fr">
      <ContentPage
        intro="Local AI Cat est conçu autour d'une IA exécutée sur l'appareil. Par défaut, vos conversations, vos modèles et vos entrées vocales restent sur votre propre matériel au lieu de transiter par nos serveurs."
        kicker="Confidentialité"
        meta="Dernière mise à jour : octobre 2026"
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

        <section className="contentCard" id="website-analytics">
          <h2>Ce site web</h2>
          <p>Nous utilisons Vercel Web Analytics pour compter les pages vues, les clics
            de téléchargement, les ouvertures du créateur et les copies réussies de codes
            de chat. Aucun cookie d’analyse n’est utilisé. Vercel dérive un identifiant
            quotidien de visiteur à partir de la requête et le supprime après 24 heures ;
            les rapports agrégés sont conservés.</p>
          <p>Ces rapports comprennent les pages, les sites référents, le pays, le type
            d’appareil et le navigateur. Nous retirons les paramètres et les fragments
            des URL envoyées et excluons les pages de compte, de paiement et les pages
            privées. Les noms, dates de naissance, codes et dessins des chats, ainsi que
            le contenu des conversations, ne sont jamais envoyés comme événements d’analyse.</p>
          <p>Le panneau des explorateurs indique l’estimation GoatCounter des visiteurs depuis
            minuit UTC, pas un nombre de personnes présentes en direct. Nous respectons
            Do Not Track et Global Privacy Control. Vous pouvez aussi désactiver les
            statistiques ci-dessous. Ce choix et votre chat personnalisé restent dans ce navigateur.</p>
          <p>Cela concerne le site web, pas l’application native. En savoir plus sur{" "}
            <a href="https://vercel.com/docs/analytics/privacy-policy">la confidentialité de Vercel Analytics</a>.</p>
          <p>Nous comptons aussi les pages publiques avec GoatCounter, sans cookie,
            via une petite image plutôt qu’un script tiers. Seul le chemin public est
            envoyé, sans paramètres, titre ni URL de provenance.
            Vercel Speed Insights mesure les performances avec les mêmes préférences.</p>
          <p>Le site compte lui-même les téléchargements Mac, les paiements commencés et les
            vérifications de mise à jour de l&rsquo;application en téléchargement direct, en totaux
            quotidiens par canal et par version. Il ne garde pour cela ni adresse IP, ni détails du
            navigateur, ni cookie. Pour compter chaque Mac une fois par jour, il garde une empreinte de
            l&rsquo;adresse et de la version, faite avec une clé supprimée au bout de deux jours. Ces totaux
            sont publics sur <a href="/stats">localaicat.com/stats</a>, avec les téléchargements App Store et
            le nombre de commandes : des chiffres seulement, jamais de montants ni de personnes.</p>
          <p>L’assistance Chatwoot se charge dans un panneau isolé uniquement à votre demande.
            Elle n’est pas chargée sur les pages de paiement, d’activation ou de compte.
            Le site ne lui transmet ni les détails de votre paiement ni l’URL de la page.
            Les informations que vous envoyez dans le chat sont traitées par Chatwoot.</p>
          <AnalyticsPreference french />
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
      </div>
    </SiteShell>
  );
}
