import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "../../_components/content-page";
import { SiteShell } from "../../_components/site-shell";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description:
    "Conditions d'utilisation de Local AI Cat : usage de l'IA sur l'appareil, forfaits payants et différences entre les versions App Store et téléchargement direct."
};

export default function TermsPageFr() {
  return (
    <SiteShell navMode="legal">
      <ContentPage
        intro="Les présentes conditions décrivent comment Local AI Cat peut être utilisé et ce à quoi vous pouvez vous attendre concernant les fonctionnalités d'IA sur l'appareil, les achats en téléchargement direct et les déploiements professionnels de l'application."
        kicker="Conditions"
        meta="Dernière mise à jour : mars 2026"
        title="Conditions d'utilisation"
        callout={
          <p>
            Cette page est la version française. Read this page in{" "}
            <Link className="textLink" href="/terms">
              English
            </Link>
            .
          </p>
        }
      >
        <div className="contentGrid">
          <section className="contentCard">
            <h2>Utilisation</h2>
            <p>
              Local AI Cat est fourni pour un usage personnel et professionnel
              selon le forfait que vous achetez. Vous ne pouvez pas
              redistribuer l'application ni rétroconcevoir les composants
              protégés, sauf dans la mesure où la loi applicable l'autorise.
            </p>
          </section>

          <section className="contentCard">
            <h2>Résultats de l'IA</h2>
            <p>
              Les systèmes d'IA peuvent commettre des erreurs. Ne vous fiez pas
              au contenu généré pour des décisions médicales, juridiques,
              financières, critiques pour la sécurité ou à fort enjeu sans
              vérification indépendante.
            </p>
          </section>
        </div>

        <section className="contentCard">
          <h2>Forfaits et droits d'accès</h2>
          <p>
            Les forfaits payants peuvent accorder un ou plusieurs droits
            d'accès, tels que l'accès Pro ou le mode Développeur. L'accès
            Équipe et Entreprise peut également dépendre de l'attribution des
            sièges, de l'état de la facturation, de l'étendue du déploiement ou
            des conditions d'assistance.
          </p>
        </section>

        <section className="contentCard">
          <h2>Facturation, résiliation et remboursements</h2>
          <p>
            Les achats Indoor Cat sont gérés par Apple et suivent les processus
            de facturation, de résiliation et de remboursement d'Apple. Les
            achats directs sur le Web pour Outdoor Cat sont gérés via Polar. Les
            abonnements directs se renouvellent jusqu'à leur résiliation ; la
            résiliation met fin à la facturation future tandis que l'accès se
            poursuit jusqu'à la fin de la période payée.
          </p>
          <p>
            Pour les achats directs uniques tels que le mode Développeur, aucun
            remboursement n'est généralement proposé après l'activation ou
            l'utilisation, sauf lorsque la loi l'exige, ou lorsque le produit
            est défectueux ou substantiellement non conforme à sa description.
            Pour toute aide concernant une commande directe, contactez{" "}
            <a className="textLink" href="mailto:support@localaicat.com">
              support@localaicat.com
            </a>
            .
          </p>
        </section>

        <section className="contentCard">
          <h2>App Store et téléchargement direct</h2>
          <p>
            Les versions App Store et en téléchargement direct peuvent différer
            en matière de processus de facturation, de méthodes d'installation
            et de fonctionnalités macOS disponibles. Les versions Outdoor Cat et
            professionnelles peuvent proposer des fonctionnalités de bureau ou
            des modes de déploiement qui ne sont pas disponibles dans la version
            Indoor Cat en bac à sable (sandbox).
          </p>
        </section>

        <section className="contentCard">
          <h2>Disponibilité du service</h2>
          <p>
            Local AI Cat est fourni « en l'état » et selon sa disponibilité.
            Nous visons un produit fiable, mais les mises à jour, les modèles,
            les services tiers et les intégrations de facturation peuvent
            évoluer au fil du temps. Aucune disposition des présentes ne limite
            les droits dont vous disposez en vertu du droit de la consommation
            applicable.
          </p>
        </section>

        <section className="contentCard">
          <h2>Contact</h2>
          <p>
            Toute question concernant les présentes conditions peut être
            adressée à{" "}
            <a className="textLink" href="mailto:legal@localaicat.com">
              legal@localaicat.com
            </a>
            .
          </p>
        </section>
      </ContentPage>
    </SiteShell>
  );
}
