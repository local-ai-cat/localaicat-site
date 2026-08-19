import styles from "../internal.module.css";
import arch from "./architecture.module.css";
import { Mermaid } from "../../_components/mermaid";

export const metadata = { title: "Architecture · Internal" };

// Source of truth: Local-AI-Chat/planning/runs/2026-08-03-architecture-review/
// architecture-state-2026-08-03.md — keep the two in sync when the state moves.

const LAYERS = `
flowchart TB
    subgraph L1["Layer 1 — Composition & gating: SOLVED, CI-enforced"]
        FC[FeatureCatalog.swift<br/>single authority]
        FC --> GEN["app/Generated/feature-composition/<br/>conditions.sh · feature-flags.yml · api-coverage.json"]
        FC --> LEDGER["FeatureLedger + RepositoryModularityAudit<br/>gold is human-award-only"]
        FC --> TESTS["19 invariant test files<br/>target membership · path truth · package coverage"]
    end
    subgraph L2["Layer 2 — Runtime seams: real but uneven"]
        LP[LaunchParticipant<br/>inverted startup]
        CBR["ChatBackendRegistry<br/>(in LocalAITextGeneration ✓)"]
        TGR["TextGenerationRuntime<br/>(in app shell ✗)"]
        TR["TranscriptionRuntime: baseline engines<br/>hardwired in shell ✗ / optional via registries ✓"]
    end
    subgraph L3["Layer 3 — Substrates: the open front"]
        HTTP[LocalAIHTTPServer]
        TXT[LocalAITextGeneration]
        TRN[LocalAITranscription]
    end
    L1 -->|verifies| L2
    L2 -->|sits on| L3
    style L1 fill:#14421f,stroke:#2ea043,color:#e6ffe6
    style L2 fill:#4a3a08,stroke:#d4af37,color:#fff8e0
    style L3 fill:#4a1518,stroke:#f85149,color:#ffe6e6
`;

const API = `
flowchart LR
    subgraph M1["1 · Shell-appended providers"]
        SHELL["LocalTranscriptionAPIServer<br/>appRouteProviders (static list,<br/>#if FEATURE_* fences)"]
    end
    subgraph M2["2 · Service injection"]
        STUDIO["RecordingSuiteStudioService<br/>→ LocalAIStudioServing"]
        LMS["LM Studio →<br/>LocalAIExternalModelServingRegistry"]
    end
    subgraph M3["3 · Route product (× exactly one)"]
        RTN["LocalAIHTTPServerRoutine<br/>composed by catalog row"]
    end
    M1 --> ROUTER[LocalAIHTTPRouter]
    M2 --> ROUTER
    M3 --> ROUTER
    style M3 fill:#14421f,stroke:#2ea043,color:#e6ffe6
`;

const ENGINES = `
flowchart TB
    E1[in-process MLX<br/>LLMEvaluator via TextGenerationRuntime] --> REG[ChatBackendRegistry]
    E2[mlxserve-embed<br/>in-process HTTP] --> REG
    E3[mlxserve sidecar<br/>macOS-only] --> REG
    E4[omlx sidecar · alpha] --> REG
    E5[GGUF] --> REG
    E6[Model Link · remote] --> REG
    E7[OpenClaw gateway] --> REG
    REG --> Q54["pkg 54 · engine A/B suite<br/>(opened 2026-08-02, BLOCKS the flip)"]
    Q54 --> Q20["pkg 20 ph.2 · default flip<br/>(PHIL'S CALL, evidence assembled)"]
    Q20 --> Q10["pkg 10 · delete LLMEvaluator<br/>(also needs pkg 29 M1: downloads re-homed)"]
`;

export default function ArchitecturePage() {
  return (
    <>
      <div className={styles.pageHead}>
        <p className={styles.pageEyebrow}>Internal · System</p>
        <h1 className={styles.pageTitle}>
          Where the
          <br />
          architecture is.
        </h1>
        <p className={styles.pageIntro}>
          The 2026-08-03 state snapshot: three layers in descending order of health, the three ways the Local API
          grows today, the engine convergence path, and the five decisions that are actually open. Every claim
          verified against the repo, not the conversation that produced it.
        </p>
      </div>

      <section className={arch.section}>
        <p className={arch.sectionEyebrow}>Health map</p>
        <h2 className={arch.sectionTitle}>Three layers, by health</h2>
        <div className={arch.prose}>
          <p>
            <b>Layer 1 is done and CI-enforced</b> — the strongest subsystem in the repo. <code>FeatureCatalog</code>{" "}
            generates the compile conditions, product rows, manifest, and API coverage; the ledger audit cannot
            under-report silently, and a script may compute a gold <i>ceiling</i> but never award gold.
          </p>
          <p>
            <b>Layer 2 is real but uneven.</b> The registries exist and route, but the domain contract from the
            modular-chat-backend spec was never built — only the registry shape survived. The MLX adapter lives in
            the shell, and the baseline speech engines bypass the transcription registry entirely.
          </p>
          <p>
            <b>Layer 3 is the open front.</b> Three packages are platform, not features — everything sits on them, so
            they can never be composed per-feature. Whether feature-grade strippability is even the right bar for
            platform code is decision 1 below.
          </p>
        </div>
        <div className={arch.diagram}>
          <Mermaid chart={LAYERS} />
        </div>
      </section>

      <section className={arch.section}>
        <p className={arch.sectionEyebrow}>Gold closure · module-nirvana</p>
        <h2 className={arch.sectionTitle}>The ledger, after the mechanical work ran out</h2>
        <div className={arch.grades}>
          <span className={`${arch.grade} ${arch.gradeGold}`}>
            <span className={arch.gradeCount}>33</span> gold
          </span>
          <span className={`${arch.grade} ${arch.gradeStrong}`}>
            <span className={arch.gradeCount}>5</span> strong
          </span>
          <span className={`${arch.grade} ${arch.gradePartial}`}>
            <span className={arch.gradeCount}>3</span> partial
          </span>
        </div>
        <div className={arch.prose}>
          <p>
            After the gold-closure increment (<code>module-nirvana</code> @ <code>8cdb6381d</code>, merge pending),
            every mechanically-fixable feature is gold. The remainder is <i>exactly</i> the decision set: the five{" "}
            <b>strong</b> are the substrate-coupled features (<code>chat-local-llm</code>, <code>transcription</code>,{" "}
            <code>local-api</code>, <code>global-transcription</code>, <code>translate</code> — decision 1), and the
            three <b>partial</b> are <code>compute</code> plus the mlxserve migration pair (decision 3). The ledger
            cannot move again until those decisions are taken.
          </p>
        </div>
      </section>

      <section className={arch.section}>
        <p className={arch.sectionEyebrow}>Local API</p>
        <h2 className={arch.sectionTitle}>Three mechanisms, which is the problem</h2>
        <div className={arch.prose}>
          <p>
            The declared side is done: 26 capability IDs with owner/usedBy edges, generated OpenAPI, generated
            coverage, CI-enforced correspondence. The contribution side has three coexisting mechanisms — and the
            static provider list is a <i>documented deliberate choice</i> (&ldquo;no registration side effect or
            runtime discovery&rdquo;), so any unification must preserve static verifiability. The counter-proposal on
            the table: keep composition static but <b>catalog-generated</b>, so adding API surface = catalog row +
            route product, with no hand-edited shell file.
          </p>
        </div>
        <div className={arch.diagram}>
          <Mermaid chart={API} />
        </div>
        <p className={arch.caption}>
          Coverage today: 2 of 41 features at full headless parity (transcription, routine-kit) · 12 at parity none ·
          the reset lifecycle verb exists on exactly 2 features.
        </p>
      </section>

      <section className={arch.section}>
        <p className={arch.sectionEyebrow}>Text generation</p>
        <h2 className={arch.sectionTitle}>Seven engines, one seam, one flip</h2>
        <div className={arch.prose}>
          <p>
            All seven ways to run a model converge on <code>ChatBackendRegistry</code> factories — the seam is
            unified; what remains is strategy, already sequenced in the queue. <code>native-mlxserve-chat-engine</code>{" "}
            is a soak switch for the migration, not a real feature; it reclassifies as a capability once the flip
            lands.
          </p>
        </div>
        <div className={arch.diagram}>
          <Mermaid chart={ENGINES} />
        </div>
      </section>

      <section className={arch.section}>
        <p className={arch.sectionEyebrow}>Custody & inventory</p>
        <h2 className={arch.sectionTitle}>Speech custody, model inventory</h2>
        <div className={arch.prose}>
          <p>
            <b>FluidAudio</b> is a speech engine that Translate happens to use, not a Translate possession — its
            registration lives in <code>FeatureTranslateModule</code> and 7 shell files reach through{" "}
            <code>TranslateModule.fluidAudio*</code> statics. It belongs with the speech stack, and the eager-release
            discipline (born of the jetsam OOM) must move with the custody, not just the files.
          </p>
          <p>
            <b>Model inventory</b> is the sharpest issue in the stack: HuggingFace MLX models, Whisper models, the
            665&nbsp;MB FluidAudio multilingual model, GGUF files, and mlxserve&rsquo;s own model directory are
            per-engine stashes. The &ldquo;metadata-only model dir counts as downloaded and 500s on load&rdquo; bug
            class comes exactly from that ambiguity. The proposal: every source converges on the unified{" "}
            <code>LocalAIModelDownloading</code> inventory as the single authority — which is also the unlock for
            headless model-management API parity.
          </p>
        </div>
      </section>

      <section className={arch.section}>
        <p className={arch.sectionEyebrow}>Open decisions</p>
        <h2 className={arch.sectionTitle}>Five calls, two of them load-bearing</h2>
        <div className={arch.tableWrap}>
          <table className={arch.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Decision</th>
                <th>Position</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>Substrate designation vs split</td>
                <td>
                  Designation. <code>FeatureCatalog.infrastructure</code> already exists — move the three substrates
                  out of the feature ledger and grade infra on contribution seams + capability parity, not
                  strippability.
                </td>
                <td>Open — now pure designation debt (the 5 strong rows)</td>
              </tr>
              <tr>
                <td>2</td>
                <td>API contribution seam</td>
                <td>
                  Route products, composed by catalog row. Counter to the paper: no runtime registry — generate the
                  provider list from the catalog instead, preserving static verifiability.
                </td>
                <td>Open — custody of route products also needs a call</td>
              </tr>
              <tr>
                <td>3</td>
                <td>Engine convergence sequencing</td>
                <td>pkg 54 A/B suite → pkg 20 ph.2 flip → pkg 10 deletes LLMEvaluator → package the chat adapter.</td>
                <td>Sequenced in QUEUE — only the flip itself is a decision</td>
              </tr>
              <tr>
                <td>4</td>
                <td>Model inventory authority</td>
                <td>
                  All sources under <code>LocalAIModelDownloading</code>; download/evict lifecycle joins the API
                  parity roadmap.
                </td>
                <td>Open — highest-leverage; unlocks pkg 10, pkg 29 M3/M4, parity</td>
              </tr>
              <tr>
                <td>5</td>
                <td>FluidAudio custody</td>
                <td>Move registration from Translate to the speech stack, eager-release behavior included.</td>
                <td>Open — small, but sequence with the speech-stack work</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className={arch.note}>
          Recommended order: settle decision 1 in conversation (the mechanism is built; it&rsquo;s a policy call),
          put the real work into decision 4 — it kills a live bug class and unblocks the most downstream.
        </div>
      </section>

      <p className={arch.provenance}>
        Source: planning/runs/2026-08-03-architecture-review/architecture-state-2026-08-03.md · verified against
        Local-AI-Chat @ a9c501688; gold-closure figures from module-nirvana @ 8cdb6381d · rendered locally, publish is
        Phil-only.
      </p>
    </>
  );
}
