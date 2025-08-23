import { useState } from "react";
import LLM from "@themaximalist/llm.js";
import { streamGemini } from "../utils/geminiStream";

interface Props {
  onComplete: (mermaidCode: string) => void;
  onChunk?: (partial: string) => void;
  onStart?: () => void;
  onStop?: () => void;
}

const MERMAID_SYSTEM_PROMPT = `You are a Mermaid diagram expert. STRICTLY output ONLY raw Mermaid diagram source. Do NOT provide any explanations, commentary, or markdown outside the raw Mermaid text.

Output rules (enforceable):
 Output raw Mermaid source only. Do NOT wrap the Mermaid source in fenced code blocks (no triple-backtick code fences).
- Do NOT include any surrounding prose, headings, or markdown.
- Generate valid Mermaid syntax for the requested diagram type (flowchart, sequenceDiagram, classDiagram, stateDiagram, gantt, journey, erDiagram, gitGraph, etc.).
- Use unique node IDs and descriptive labels.
- Keep output concise: only the diagram source.

If the user request is ambiguous, choose reasonable defaults but still output only raw Mermaid code.

NON-NEGOTIABLE RULES:
- For every node definition, if the label contains parentheses, commas, colons, double quotes, or other punctuation that could break parsing, ALWAYS wrap the entire label in double quotes inside the node shape. Example: D["CDN (CloudFront)"]
- Never emit unquoted labels when they contain parentheses. This must hold throughout the response, including later sections of longer diagrams.
- Output raw Mermaid only (no fenced blocks, no extra prose).`;

export default function LLMJSMermaidGenerator({
  onComplete,
  onChunk,
  onStart,
  onStop,
}: Props) {
  const [apiKey, setApiKey] = useState("");
  const [service, setService] = useState("google");
  const [model, setModel] = useState("gemini-2.0-flash");
  const [userInput, setUserInput] = useState("");
  // response state removed; editor receives streamed code
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ...example prompts removed (streaming UI uses editor as source)

  const serviceOptions = [
    { value: "google", label: "Google (Gemini)" },
    { value: "openai", label: "OpenAI (GPT)" },
    { value: "anthropic", label: "Anthropic (Claude)" },
    { value: "mistral", label: "Mistral" },
    { value: "cohere", label: "Cohere" },
    { value: "groq", label: "Groq" },
    { value: "together", label: "Together AI" },
  ];

  // Few-shot examples: user -> assistant pairs to bias structure
  const FEW_SHOT_EXAMPLES = [
    {
      user: "Visualize a scalable company app on AWS. Show how traffic flows from a global load balancer to servers in different zones. Include a database, a data warehouse, and a CI/CD pipeline.",
      assistant:
        '\ngraph TD\n\n  %% ============ GLOBAL CLOUD TOPOLOGY ============\n  A[Global User Base] --> B["Global Load Balancer \n(Cloudflare / AWS Global Accelerator)"]\n  B --> C["Primary Region: us-east-1"]\n  B --> D["Failover Region: eu-west-1"]\n  D -->|"Passive (DR)"| E["Cross-Region Replication"]\n\n  %% ============ PRIMARY REGION: us-east-1 ============\n  subgraph "Region: us-east-1 (Primary)"\n    direction TB\n\n    subgraph "Availability Zones"\n      direction TB\n\n      subgraph "AZ-A"\n        direction TB\n\n        subgraph "VPC: vpc-prod-core"\n          direction TB\n\n          subgraph "Public Subnet A1"\n            A1["Public ALB \n(HTTP/HTTPS)"] --> A2["NAT Gateway"]\n            A1 --> A3["Jump Host \n(Bastion)"]\n            A3 --> A4["Security Group \n(SSH Only)"]\n          end\n\n          subgraph "Private Subnet A2"\n            A5["App Tier: Web Servers \n(Auto Scaling)"] --> A6["Security Group \n(8080 \u2192 ALB)"]\n            A5 --> A7["SSM Agent \n(Systems Manager)"]\n            A7 --> A8["CloudWatch Logs"]\n          end\n\n          subgraph "Private Subnet A3"\n            A9["App Tier: API Services \n(Fargate / EKS)"] --> A10["IAM Roles"]\n            A9 --> A11["Secrets Manager \n(DB Credentials)"]\n            A11 --> A12["KMS Key \n(Encrypted)"]\n          end\n\n          subgraph "Isolated Subnet A4"\n            A13["RDS Cluster \n(PostgreSQL Multi-AZ)"] --> A14["Read Replica"]\n            A13 --> A15["Automated Backups \n(7-day retention)"]\n            A13 --> A16["Database Security Group"]\n            A16 --> A17["Inbound: 5432 \u2190 App SG"]\n          end\n\n          %% Internal VPC Flow\n          A1 --> A5\n          A5 --> A9\n          A9 --> A13\n          A8 --> Z1["Central Logging"]\n          A10 --> Z2["Identity & Access Audit"]\n        end\n\n      end\n\n      subgraph "AZ-B"\n        direction TB\n\n        subgraph "VPC: vpc-prod-data"\n          direction TB\n\n          subgraph "Public Subnet B1"\n            B1["Direct Connect Gateway"] --> B2["AWS DX \n(10Gbps)"]\n          end\n\n          subgraph "Private Subnet B2"\n            B3["Kafka Cluster \n(msk-prod)"] --> B4["Encryption at Rest \n(KMS)"]\n            B3 --> B5["Replication Factor: 3"]\n          end\n\n          subgraph "Isolated Subnet B3"\n            B6["Redshift Data Warehouse"] --> B7["Column-Level Encryption"]\n            B6 --> B8["VPC Endpoint \n(Private S3 Access)"]\n            B8 --> B9["S3 Bucket \n(aws-logs-prod)"]\n          end\n\n          B2 --> B3\n          B3 --> B6\n          B9 --> Z1\n        end\n\n      end\n\n      subgraph "AZ-C"\n        direction TB\n\n        subgraph "VPC: vpc-prod-critical"\n          direction TB\n\n          subgraph "Private Subnet C1"\n            C1["EKS Control Plane \n(Private Endpoint)"] --> C2["Node Group A"]\n            C2 --> C3["Pod: Fraud Detection Service"]\n            C3 --> C4["Service Mesh \n(Istio Sidecar)"]\n            C4 --> C5["Observability: Jaeger + Prometheus"]\n          end\n\n          subgraph "Isolated Subnet C2"\n            C6["Hardware Security Module \n(HSM)"] --> C7["Key Storage \n(FIPS 140-2 Level 3)"]\n            C7 --> C8["Used by RDS, Redshift, App Secrets"]\n          end\n\n          C1 --> C6\n          C5 --> Z3["Central Monitoring"]\n        end\n\n      end\n\n    end\n\n    %% Cross-AZ & Inter-VPC\n    A13 --> B3\n    B3 --> C3\n    A9 --> B3\n  end\n\n  %% ============ SECONDARY REGION: eu-west-1 (Disaster Recovery) ============\n  subgraph "Region: eu-west-1 (DR / Backup)"\n    direction TB\n\n    subgraph "AZ-A"\n      DR1["RDS Snapshot Replication"] --> DR2["Standby Cluster"]\n      DR2 --> DR3["Recovery Time Objective: 4min"]\n    end\n\n    subgraph "AZ-B"\n      DR4["EKS: Backup Control Plane"] --> DR5["ETCD Snapshots \n(Encrypted)"]\n    end\n\n    subgraph "VPC: vpc-dr-core"\n      DR6["S3 Cross-Region Replication"] --> DR7["Backup Bucket \n(eu-backup-bank-data)"]\n      DR7 --> DR8["Compliance Archive \n(Glacier Vault)"]\n    end\n\n    DR2 --> DR7\n    DR5 --> DR7\n  end\n\n  %% ============ ON-PREM / HYBRID CONNECTIVITY ============\n  subgraph "On-Premises Data Center"\n    OP1[Corporate Network] --> OP2["Active Directory \n(On-Prem)"]\n    OP2 --> OP3["AD Connector \n(AWS Directory Service)"]\n    OP3 --> C10["IAM Identity Center"]\n    OP1 --> OP4["Legacy Core Banking System"]\n    OP4 --> B1\n  end\n\n  %% ============ SECURITY & GOVERNANCE LAYER ============\n  subgraph "Security & Compliance"\n    SEC1["Central Security Account"] --> SEC2["GuardDuty \n(Threat Detection)"]\n    SEC2 --> SEC3["Automated Response \n(Lambda)"]\n    SEC1 --> SEC4["Security Hub \n(Consolidated View)"]\n    SEC1 --> SEC5["Config Rules \n(Compliance Checks)"]\n    SEC5 --> SEC6["Non-Compliant? --> Alert"]\n    SEC1 --> SEC7["CloudTrail \n(Management Events)"]\n    SEC7 --> Z1\n  end\n\n  %% ============ OBSERVABILITY HUB ============\n  subgraph "Observability & Operations"\n    Z1["S3: Central Logs"] --> Z2["FireLens + OpenSearch"]\n    Z2 --> Z3["Grafana \n(Monitoring Dashboard)"]\n    Z3 --> Z4["PagerDuty \n(On-Call Alerts)"]\n    Z3 --> Z6["SLA Report \n(Weekly)"]\n    Z1 --> Z5["Athena \n(Log Queries)"]\n  end\n\n  %% ============ CI/CD PIPELINE ============\n  subgraph "CI/CD & DevOps"\n    CD1[GitHub Enterprise] --> CD2["CodePipeline \n(Dev \u2192 Staging \u2192 Prod)"]\n    CD2 --> CD3["CodeBuild \n(Unit + Security Scan)"]\n    CD3 -->|Approved| CD4["CodeDeploy \n(Blue/Green)"]\n    CD4 --> A5\n    CD4 --> A9\n    CD4 --> C3\n    CD1 --> CD5["Pull Request: SAST Scan \n(SonarQube)"]\n  end\n\n  %% ============ DATA FLOW & CONNECTIONS ============\n  B --> C\n  B --> D\n  E --> DR1\n  A8 --> Z1\n  A10 --> SEC7\n  B9 --> Z1\n  C5 --> Z3\n  DR7 --> Z1\n  SEC7 --> Z1\n  CD5 --> SEC4\n  OP4 --> B3\n  C8 --> A12\n  C8 --> B4\n  C8 --> B7',
    },
    {
      user: "Draw a cloud architecture diagram for an online store. Include microservices for user auth, product search, and orders. Use Kafka for events and Redis for the shopping cart. Show how a user buys a product.",
      assistant:
        'graph TD\n\n  %% ============ ROOT SYSTEM ============\n  A[User Browser] -->|HTTPS| B[Edge Load Balancer]\n  B --> C["API Gateway \n(Auth, Rate Limit, Routing)"]\n\n  %% ============ AUTH SUBSYSTEM ============\n  subgraph Authentication & User Management\n    C --> D["Auth Service \n(OAuth2, JWT, SSO)"]\n    D --> E["User Database \n(PostgreSQL)"]\n    D --> F["Redis Session Cache"]\n    D --> G["Identity Provider \n(Okta / Auth0)"]\n    E --> H["Backup Replica \n(Async)"]\n    F --> I["Persistent Snapshot \n(Every 5min)"]\n  end\n\n  %% ============ PRODUCT DOMAIN ============\n  subgraph Product Catalog Management\n    C --> J["Product Service"]\n    J --> K["Product Database \n(MongoDB)"]\n    J --> L["Elasticsearch Index \n(Search & Filter)"]\n    J --> M["Image CDN \n(Cloudflare R2)"]\n    K --> N["Change Data Capture \n(Debezium)"]\n    N --> O["Event Bus \n(Kafka)"]\n  end\n\n  %% ============ CART & ORDER DOMAIN ============\n  subgraph Shopping Cart & Order Processing\n    C --> P["Cart Service \n(Stateless)"]\n    P --> Q["Redis Cart Storage \n(UserID \u2192 Items)"]\n    Q --> R["Expiration Policy \n(30min TTL)"]\n\n    C --> S["Order Service"]\n    S --> T["Order Database \n(Primary-Replica)"]\n    S --> U["Payment Service \n(gRPC)"]\n    S --> V["Inventory Service \n(gRPC)"]\n    V --> W["Stock Deduction Lock \n(Distributed)"]\n    U --> X["Stripe / PayPal API"]\n    S --> Y["Order Event Publisher"]\n    Y --> O\n  end\n\n  %% ============ EVENT-DRIVEN BACKBONE ============\n  subgraph Event-Driven Architecture\n    O["Event Bus: Apache Kafka"] --> Z["Consumer Groups"]\n\n    subgraph Async Consumers\n      Z --> AA["Email Service \n(Welcome, Confirmations)"]\n      Z --> AB["Analytics Engine \n(Clickstream)"]\n      Z --> AC["Search Index Updater \n(\u2192 Elasticsearch)"]\n      Z --> AD["Audit Logger \n(Writes to S3)"]\n      Z --> AE["Recommendation Engine \n(ML Model Refresh)"]\n    end\n\n    O --> AF["Kafka Connect \n(Streams to Data Lake)"]\n    AF --> AG["Data Lake \n(S3 + Parquet)"]\n    AG --> AH["Spark ETL Pipeline"]\n    AH --> AI["Data Warehouse \n(Snowflake)"]\n    AI --> AJ["BI Dashboard \n(Tableau)"]\n  end\n\n  %% ============ NOTIFICATION & COMMUNICATION ============\n  subgraph Notification System\n    AA --> AK["SMTP Gateway"]\n    AA --> AL["Push Notification \n(Firebase Cloud Msg)"]\n    AA --> AM["SMS Gateway \n(Twilio)"]\n    AL --> AN[Mobile App]\n    AM --> AO[User Phone]\n    AK --> AP[User Email Inbox]\n  end\n\n  %% ============ ADMIN & OPERATIONS ============\n  subgraph Admin & Internal Tools\n    AQ[Admin Panel] --> AR["Admin API \n(Role: admin-only)"]\n    AR --> AS["Service Mesh \n(Istio)"]\n    AS --> AT["Metric Collector \n(Prometheus)"]\n    AS --> AU["Trace Collector \n(Jaeger)"]\n    AT --> AV["Grafana Dashboard"]\n    AU --> AW["Trace Visualization"]\n    AS --> AX["Circuit Breakers \n(Hystrix)"]\n  end\n\n  %% ============ DEPLOYMENT INFRASTRUCTURE ============\n  subgraph Deployment & Scaling\n    AZ[Kubernetes Cluster]\n    BA[Ingress Controller] --> BZ[Edge LB]\n    BB["Pod: Auth Service"] --> AZ\n    BC["Pod: Product Service"] --> AZ\n    BD["Pod: Order Service"] --> AZ\n    BE["Horizontal Pod Autoscaler \n(CPU/Memory)"] --> AZ\n    BF["CI/CD Pipeline \n(GitLab CI)"] --> BG["Docker Images"]\n    BG --> BH["Image Registry \n(ECR)"]\n    BH --> BI["Helm Charts"]\n    BI --> AZ\n  end\n\n  %% ============ EXTERNAL INTEGRATIONS ============\n  subgraph External Partners\n    X --> BJ["Payment Network \n(VISA/Mastercard)"]\n    AJ --> BK[Marketing Team]\n    AC --> BL["Search Analytics \n(Google)"]\n  end\n\n  %% ============ RESILIENCE LAYER ============\n  subgraph Resilience Layer\n    U --> BM["Retry Policy \n(Exponential Backoff)"]\n    V --> BN["Timeout Circuit \n(500ms)"]\n    S --> BO["Dead Letter Queue \n(Kafka DLQ)"]\n    BO --> BP["Manual Reconciliation UI"]\n  end\n\n  %% ============ DATA FLOW CONNECTIONS ============\n  O --> AC\n  O --> AD\n  O --> AE\n  O --> AA\n  S --> Y\n  J --> N\n  N --> O\n  P --> Q\n  S --> T\n  C --> D\n  C --> J\n  C --> P\n  C --> S\n  B --> C',
    },
    {
      user: "Map out a secure bank's AWS setup. Show a primary and a backup region. Include private networks for servers and databases. Add a connection to an on-premise data center and a central logging system.",
      assistant:
        '\ngraph TD\n\n  %% ============ GLOBAL ACCESS LAYER ============\n  A["User Devices \n(Web, Mobile)"] -->|HTTPS:443| B["Global Load Balancer \n(Cloudflare / AWS Global Accelerator)"]\n  B -->|Anycast| C["Region: us-east-1 (Primary)"]\n  B -->|Failover| D["Region: eu-west-1 (DR)"]\n  D -->|"Replicated via S3 CRR"| E["Cross-Region Sync \n(Eventual Consistency)"]\n\n  %% ============ PRIMARY REGION: us-east-1 ============\n  subgraph "Region: us-east-1 (Primary) | vpc-11112222 | 10.0.0.0/16"\n    direction TB\n\n    subgraph "AZ-A | us-east-1a"\n      direction TB\n\n      subgraph "VPC: vpc-prod-core | 10.0.0.0/16"\n        direction TB\n\n        subgraph "Public Subnet A1 | 10.0.1.0/24"\n          direction TB\n          A1["ALB \n(Public, HTTPS:443)"] --> A2["NAT Gateway \n(egress-only)"]\n          A1 --> A3["Bastion Host \n(ec2-bastion-01, SSH:22)"]\n          A3 --> A4["Security Group: sg-bastion \n(In:22 from Corp IP)"]\n        end\n\n        subgraph "Private App Subnet A2 | 10.0.2.0/24"\n          direction TB\n          A5["Web Server ASG \n(i-abc123, i-xyz789)"] --> A6["SG: sg-web \n(In:8080 \u2190 ALB, Out:\u2192 DB)"]\n          A5 --> A7["SSM Agent \n(Managed Instance)"]\n          A7 --> A8["CloudWatch Logs \n/log-group/prod/web"]\n        end\n\n        subgraph "Private API Subnet A3 | 10.0.3.0/24"\n          direction TB\n          A9["API ECS Cluster \n(fargate-api-prod)"] --> A10["IAM Task Role: api-role-prod"]\n          A9 --> A11["Secrets Manager \n(secret/db-prod-app)"]\n          A11 --> A12["KMS Key: alias/prod/db-key \n(Symmetric, AWS-GCM)"]\n        end\n\n        subgraph "DB Subnet A4 | Isolated | 10.0.4.0/24"\n          direction TB\n          A13["RDS PostgreSQL \n(cluster-prod-repl, Multi-AZ)"] --> A14["Read Replica \n(cluster-prod-ro]"]\n          A13 --> A15["Backup: daily, 7-day retention"]\n          A13 --> A16["SG: sg-db-prod \n(In:5432 \u2190 API SG)"]\n          A16 --> A17["Encryption: KMS, TLS in transit"]\n        end\n\n        %% Internal flows\n        A1 -->|HTTPS:443| A5\n        A5 -->|HTTP:8080| A9\n        A9 -->|TLS:5432| A13\n        A8 --> Z1["Central Log Aggregation"]\n        A10 --> Z4["IAM Access Audit Trail"]\n      end\n\n    end\n\n    subgraph "AZ-B | us-east-1b"\n      direction TB\n\n      subgraph "VPC: vpc-prod-data | 10.1.0.0/16"\n        direction TB\n\n        subgraph "Data Public Subnet B1 | 10.1.1.0/24"\n          B1["Direct Connect Gateway"] --> B2["AWS DX \n(dx-conn-bank-primary, 10Gbps)"]\n        end\n\n        subgraph "Private Stream Subnet B2 | 10.1.2.0/24"\n          B3["MSK Cluster \n(kafka-prod, 6 brokers)"] --> B4["Encryption: KMS, TLS"]\n          B3 --> B5["Replication Factor: 3, ACK=all"]\n          B5 --> B6["Topics: tx-events, fraud-alerts"]\n        end\n\n        subgraph "Isolated DW Subnet B3 | 10.1.3.0/24"\n          B7["Redshift Cluster \n(redshift-bank-dw)"] --> B8["Column Encryption: AES-256"]\n          B7 --> B9["VPC Endpoint: com.amazonaws.us-east-1.s3"]\n          B9 --> B10["S3: aws-logs-prod \n(s3://logs-bank-central)"]\n        end\n\n        B2 -->|BGP| B3\n        B3 -->|Kafka Producer| B7\n        B10 --> Z1\n      end\n\n    end\n\n    subgraph "AZ-C | us-east-1c"\n      direction TB\n\n      subgraph "VPC: vpc-prod-critical | 10.2.0.0/16"\n        direction TB\n\n        subgraph "Private EKS Subnet C1 | 10.2.1.0/24"\n          C1["EKS Control Plane \n(Private Endpoint)"] --> C2["Node Group: ng-prod-core"]\n          C2 --> C3["Pod: fraud-detection-svc"]\n          C3 --> C4["Istio Sidecar \n(mTLS between services)"]\n          C4 --> C5["Prometheus + Jaeger \n(scraping every 15s)"]\n        end\n\n        subgraph "HSM Subnet C2 | Isolated | 10.2.2.0/24"\n          C6["AWS CloudHSM Cluster \n(hsm-cluster-prod)"] --> C7["Key Storage: FIPS 140-2 Level 3"]\n          C7 --> C8["Used by: RDS, Redshift, App Secrets"]\n        end\n\n        C1 -->|Secure API Call| C6\n        C5 --> Z2["Observability Hub"]\n      end\n\n    end\n\n    %% Cross-VPC & Cross-AZ\n    A13 -->|Replicate WAL| B3\n    B3 -->|Stream: tx-events| C3\n    A9 -->|Async: gRPC| B3\n  end\n\n  %% ============ DISASTER RECOVERY REGION: eu-west-1 ============\n  subgraph "Region: eu-west-1 (DR) | vpc-33334444 | 10.3.0.0/16"\n    direction TB\n\n    subgraph "AZ-A | eu-west-1a"\n      DR1["RDS: Restore from Snapshot \n(last 5min)"] --> DR2["Cluster: cluster-dr-ro"]\n      DR2 --> DR3["RTO: <5min, RPO: 5min"]\n    end\n\n    subgraph "AZ-B | eu-west-1b"\n      DR4["EKS: Standby Control Plane"] --> DR5["ETCD: Encrypted Snapshots \n(s3://eks-backups-dr)"]\n    end\n\n    subgraph "VPC: vpc-dr-backup | 10.3.1.0/24"\n      DR6["S3: Cross-Region Replication"] --> DR7["Bucket: eu-backup-bank-data"]\n      DR7 --> DR8["Glacier Vault: vault-bank-compliance \n(Retention: 7 years)"]\n    end\n\n    DR2 --> DR7\n    DR5 --> DR7\n  end\n\n  %% ============ ON-PREM / HYBRID ============\n  subgraph "On-Prem Data Center | 192.168.10.0/24"\n    OP1["Corporate Network"] --> OP2["Active Directory \n(dc01.bank.local)"]\n    OP2 --> OP3["AWS AD Connector \n(c-11223344556677889)"]\n    OP3 --> A10\n    OP1 --> OP4["Core Banking System \n(mainframe-zos-01)"]\n    OP4 -->|SFTP:22| B2\n  end\n\n  %% ============ SECURITY & COMPLIANCE ============\n  subgraph "Security & Governance | Account: 998877665544"\n    SEC1["Security Account"] --> SEC2["Amazon GuardDuty \n(Threat Intelligence)"]\n    SEC2 --> SEC3["Auto-Remediate: Lambda \n(Isolate EC2 on alert)"]\n    SEC1 --> SEC4["AWS Security Hub \n(Central Dashboard)"]\n    SEC1 --> SEC5["AWS Config \n(Rule: encrypted-volumes-required)"]\n    SEC5 --> SEC6["Alert: Non-Compliant Resource"]\n    SEC1 --> SEC7["CloudTrail \n(Multi-Region Logging)"]\n    SEC7 --> Z1\n  end\n\n  %% ============ OBSERVABILITY HUB ============\n  subgraph "Observability | Central Account"\n    Z1["S3: logs-bank-central"] --> Z2["OpenSearch Domain \n(os-bank-prod)"]\n    Z2 --> Z3["Grafana: monitor.bank.internal"]\n    Z3 --> Z4["Alert: PagerDuty \n(On-call rotation)"]\n    Z1 --> Z5["Athena: SQL Queries \n(Cost: $0.005/query)"]\n    Z3 --> Z6["SLA Report: weekly.pdf \n(>99.95% uptime)"]\n  end\n\n  %% ============ CI/CD PIPELINE ============\n  subgraph "CI/CD Pipeline | Account: 112233445566"\n    CD1["GitHub Enterprise \n(repo: bank-app/prod)"] --> CD2["CodePipeline: prod-deploy-pipeline"]\n    CD2 --> CD3["CodeBuild: build-and-scan \n(SonarQube + Trivy)"]\n    CD3 -->|Approval Stage| CD4["CodeDeploy: blue-green \n(ASG: web-server-asg)"]\n    CD4 --> A5\n    CD4 --> A9\n    CD4 --> C3\n  end\n\n  %% ============ DATA FLOWS & INTEGRATIONS ============\n  B --> C\n  B --> D\n  E --> DR1\n  A8 --> Z1\n  A10 --> SEC7\n  B10 --> Z1\n  C5 --> Z2\n  DR7 --> Z1\n  SEC7 --> Z1\n  CD3 --> SEC4\n  OP4 --> B3\n  C8 --> A12\n  C8 --> B4\n  C8 --> B8\n',
    },
  ];

  // example prompt helper removed

  const generateMermaid = async () => {
    if (!apiKey || !userInput) {
      setError("Please provide both API key and prompt");
      return;
    }

  setLoading(true);
  setError("");

    if (onStart) onStart();

    // Build messages: system, few-shot examples, then user prompt
    const messages: any[] = [
      { role: "system", content: MERMAID_SYSTEM_PROMPT },
    ];

    // Add few-shot examples
    for (const ex of FEW_SHOT_EXAMPLES) {
      messages.push({ role: "user", content: ex.user });
      messages.push({ role: "assistant", content: ex.assistant });
    }

    // Add current user input
    // Wrap the raw user input inside a safe template that documents
    // ground rules for generating Mermaid code. This helps prevent
    // generation of node contents that contain unescaped double quotes
    // or parentheses that break the mermaid preview. The template
    // is explicit and will be included as the user's prompt.
    const USER_PROMPT_TEMPLATE = [
      "Please follow these rules when generating Mermaid diagram source:",
      "- NON-NEGOTIABLE: If a node label contains parentheses, commas, colons, double quotes, or other punctuation that may break Mermaid parsing, ALWAYS wrap the full label in double quotes inside the node brackets. Example:",
      "  - Wrong: D[CDN (CloudFront)]",
      "  - Correct: D[\"CDN (CloudFront)\"]",
      "- Escape any literal double quotes inside labels with a backslash (\\\"). Example: A[\"Name \\\"Inc\\\"\"]",
      "- Do NOT emit prose, commentary, or extra markdown — output only the raw Mermaid source. Do NOT use fenced code blocks.",
      "- Maintain these quoting rules consistently throughout long outputs; if you generate a label earlier correctly, do not later revert to unquoted labels.",
      "",
      "User request:",
      userInput,
    ].join("\n");

    // Post-generation sanitizer: ensure node labels with parentheses are quoted.
    function sanitizeMermaidLabels(src: string) {
      if (!src) return src;
      // Replace unquoted square-bracket node labels that contain parentheses or double quotes
      const replaced = src.replace(/([A-Za-z0-9_]+)\[((?:(?!["']).)*?)\]/g, (m, id, label) => {
        // If label already starts with a quote, leave it alone
        if (/^["']/.test(label)) return m;
        // If label contains parentheses, double quotes, or problematic punctuation, quote it
        if (/[()"\[\],:;]/.test(label)) {
          const esc = label.replace(/\\/g, "\\\\").replace(/\"/g, '\\\"');
          return `${id}["${esc}"]`;
        }
        return m;
      });

      // Also sanitize subgraph titles like: subgraph Frontend (Global)
      const subgraphFixed = replaced.replace(/^([ \t]*subgraph\s+)([^|\n\r]+)(\|[^\n\r]*)?$/gmi, (m, pre, title, rest) => {
        let t = String(title).trim();
        // If already quoted, leave alone
        if (/^["']/.test(t)) return m;
        // If title contains parentheses or other punctuation that may break parsing, quote it
        if (/[()"\[\],:;]/.test(t)) {
          const esc = t.replace(/\\/g, "\\\\").replace(/\"/g, '\\\"');
          return `${pre}\"${esc}\"${rest || ""}`;
        }
        return m;
      });

      return subgraphFixed;
    }

    messages.push({ role: "user", content: USER_PROMPT_TEMPLATE });

    const config = {
      service: service,
      model: model,
      apiKey: apiKey,
      temperature: 0.3, // Lower temperature for more consistent code generation
      max_tokens: 20000,
      stream: true,
    };

    // Helper: create a parser that extracts mermaid code between ```mermaid and ```
    function createMermaidStreamParser(
      onPartial: (s: string) => void,
      onDone: (s: string) => void
    ) {
      let buffer = "";
      let mermaid = "";
      let inCode = false;
      let finished = false;
      const startMarker = "```mermaid";
      const endMarker = "```";
      const rawStartRegex =
        /\b(graph|flowchart|sequenceDiagram|stateDiagram|classDiagram|gantt|journey|erDiagram|gitGraph|pie|timeline|infoDiagram)\b/i;

      const append = (chunk: string) => {
        if (finished) return;
        buffer += chunk;

        while (buffer.length && !finished) {
          if (!inCode) {
            // Look for fenced code block
            const si = buffer.indexOf(startMarker);
            if (si !== -1) {
              const after = si + startMarker.length;
              if (buffer.length > after && buffer[after] === "\n") {
                buffer = buffer.slice(after + 1);
              } else {
                buffer = buffer.slice(after);
              }
              inCode = true;
              continue;
            }

            // Look for raw mermaid start
            const m = buffer.match(rawStartRegex);
            if (m) {
              const idx = buffer.indexOf(m[0]);
              if (idx !== -1) {
                inCode = true;
                mermaid += buffer.slice(idx);
                buffer = "";
                onPartial(mermaid);
                break;
              }
            }

            // Keep buffer from getting too large
            if (buffer.length > 2048) {
              buffer = buffer.slice(-2048);
            }
            break;
          } else {
            // We're inside code block, look for end marker
            const ei = buffer.indexOf(endMarker);
            if (ei === -1) {
              // No end marker yet, add everything to mermaid
              mermaid += buffer;
              buffer = "";
              onPartial(mermaid);
              break;
            } else {
              // Found end marker
              mermaid += buffer.slice(0, ei);
              finished = true;
              onDone(mermaid);
              buffer = buffer.slice(ei + endMarker.length);
              break;
            }
          }
        }
      };

      const finish = () => {
        if (finished) return;

        if (!inCode) {
          // Try to find raw mermaid in remaining buffer
          const m = buffer.match(rawStartRegex);
          if (m) {
            const idx = buffer.indexOf(m[0]);
            if (idx !== -1) {
              mermaid += buffer.slice(idx);
            }
          }
        } else {
          // Add remaining buffer to mermaid
          mermaid += buffer;
        }

        finished = true;
        onDone(mermaid);
      };

      return { append, finish };
    }

    // Create parser
    const parser = createMermaidStreamParser(
        (partial) => {
        if (onChunk) onChunk(partial);
      },
      (finalStr) => {
        const cleaned = finalStr.trim();
        const sanitized = sanitizeMermaidLabels(cleaned);
        if (onComplete) onComplete(sanitized);
      }
    );

    try {
      console.log("[LLMJSMermaidGenerator] Starting stream with config:", {
        service,
        model,
      });

      // If using Google Gemini, prefer the direct GoogleGenerativeAI stream helper
      // which has a stable streaming interface. This mirrors the older working
      // implementation in `utils/geminiStream.ts`.
      if (service === "google") {
        console.log("[LLMJSMermaidGenerator] Using Google generative stream helper");

        // Build a combined prompt by including few-shot examples before the user input.
        // Use the same user prompt template so the Google stream receives the
        // ground rules upfront and the actual request embedded at the end.
        let combinedPrompt = "";
        for (const ex of FEW_SHOT_EXAMPLES) {
          combinedPrompt += `User: ${ex.user}\nAssistant:\n${ex.assistant}\n\n`;
        }
        combinedPrompt += USER_PROMPT_TEMPLATE;

        try {
          const final = await streamGemini(apiKey, model, MERMAID_SYSTEM_PROMPT, combinedPrompt, (txt) => {
            // pipe chunks into the existing parser so UI updates incrementally
            console.log("[LLMJSMermaidGenerator] gemini onChunk:", txt);
            parser.append(txt);
          });

          // Ensure parser finishes and emit final result
          parser.finish();
          const cleaned = (final || "").trim();
          const sanitizedFinal = sanitizeMermaidLabels(cleaned);
          if (onComplete) onComplete(sanitizedFinal);
          return;
        } catch (gErr) {
          console.error("[LLMJSMermaidGenerator] Google stream error:", gErr);
          throw gErr;
        }
      }

      // Helper functions for processing stream chunks
      const textDecoder = new TextDecoder();

      const coerceToString = (token: any): string => {
        try {
          if (typeof token === "string") return token;

          // Handle typed arrays and ArrayBuffers
          if (
            ArrayBuffer.isView(token) ||
            token?.buffer instanceof ArrayBuffer
          ) {
            try {
              return textDecoder.decode(token as any);
            } catch {
              return String(token);
            }
          }

          // Handle objects with text content
          if (typeof token === "object" && token !== null) {
            const text =
              token.text ??
              token.delta ??
              token.content ??
              token.message?.content ??
              token.choices?.[0]?.delta?.content ??
              token.choices?.[0]?.text ??
              token.candidates?.[0]?.content?.parts?.[0]?.text;

            if (typeof text === "string") return text;
            if (typeof token.data === "string") return token.data;
            return JSON.stringify(token);
          }

          return String(token);
        } catch {
          return String(token);
        }
      };

      const isAsyncIterable = (obj: any) =>
        obj && typeof obj[Symbol.asyncIterator] === "function";
      const isReadableStreamLike = (obj: any) =>
        obj && typeof obj.getReader === "function";

      const processChunk = (chunk: string) => {
        if (!chunk) return;

        console.log("[LLMJSMermaidGenerator] Raw chunk received:", chunk);

        // Handle SSE format if present
        if (chunk.includes("data:")) {
          const lines = chunk.split(/\r?\n/);
          for (const line of lines) {
            if (line.startsWith("data:")) {
              const payload = line.slice(5).trimStart();
              if (payload === "[DONE]") continue;

              try {
                const obj = JSON.parse(payload);
                const text =
                  obj.text ??
                  obj.delta ??
                  obj.content ??
                  obj.message?.content ??
                  obj.candidates?.[0]?.content?.parts?.[0]?.text ??
                  obj.choices?.[0]?.delta?.content ??
                  obj.choices?.[0]?.text;

                if (typeof text === "string") {
                  console.log(
                    "[LLMJSMermaidGenerator] Extracted text from SSE:",
                    text
                  );
                  parser.append(text);
                } else {
                  console.log(
                    "[LLMJSMermaidGenerator] Using raw payload:",
                    payload
                  );
                  parser.append(payload);
                }
              } catch {
                console.log(
                  "[LLMJSMermaidGenerator] Using raw payload (parse failed):",
                  payload
                );
                parser.append(payload);
              }
            }
          }
        } else {
          console.log(
            "[LLMJSMermaidGenerator] Processing as plain text:",
            chunk
          );
          parser.append(chunk);
        }
      };

      // Get stream from LLM.js
  const stream: any = await LLM(messages, config);
  console.log("[LLMJSMermaidGenerator] Stream type:", typeof stream);

      if (isAsyncIterable(stream)) {
        console.log("[LLMJSMermaidGenerator] Processing as async iterator");
        for await (const token of stream) {
          console.log("[LLMJSMermaidGenerator] Raw token:", token);
          const textChunk = coerceToString(token);
          processChunk(textChunk);
        }
      } else if (isReadableStreamLike(stream)) {
        console.log("[LLMJSMermaidGenerator] Processing as ReadableStream");
        const reader = stream.getReader();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          console.log("[LLMJSMermaidGenerator] Stream value:", value);
          const textChunk = coerceToString(value);
          processChunk(textChunk);
        }
      } else if (stream?.body && isReadableStreamLike(stream.body)) {
        console.log(
          "[LLMJSMermaidGenerator] Processing Response.body as ReadableStream"
        );
        const reader = stream.body.getReader();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          console.log("[LLMJSMermaidGenerator] Response body value:", value);
          const textChunk = coerceToString(value);
          processChunk(textChunk);
        }
      } else {
        console.log(
          "[LLMJSMermaidGenerator] Unknown stream type, attempting single conversion"
        );
        const textChunk = coerceToString(stream);
        processChunk(textChunk);
      }

      // Finalize parser
      parser.finish();
    } catch (error: any) {
      console.error("[LLMJSMermaidGenerator] Stream error:", error);
      const errorMessage =
        error?.message || String(error) || "Failed to generate Mermaid code";
      setError(errorMessage);
    } finally {
      setLoading(false);
      if (onStop) onStop();
    }
  };

  const clearResponse = () => {
  setError("");
  };

  return (
    <div className="px-3 py-2 bg-white">
      <div className="mb-2 d-flex align-items-center justify-content-between">
        <label className="form-label small text-muted mb-0 fw-medium">
          <i className="bi bi-robot me-1"></i>
          AI Mermaid Generator
        </label>
        <small className="text-muted" style={{ fontSize: 11 }}>
          Powered by LLM.js
        </small>
      </div>

      {/* API Configuration */}
      <div className="mb-3">
        <div className="row g-2">
          <div className="col-6">
            <label className="form-label small text-muted">API Key</label>
            <input
              type="password"
              className="form-control form-control-sm"
              placeholder="Enter your API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <div className="col-3">
            <label className="form-label small text-muted">Service</label>
            <select
              className="form-select form-select-sm"
              value={service}
              onChange={(e) => setService(e.target.value)}
            >
              {serviceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-3">
            <label className="form-label small text-muted">Model</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Model name"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* User Input */}
      <div className="mb-3">
        <label className="form-label small text-muted">
          Describe your diagram
        </label>
        <textarea
          className="form-control"
          rows={3}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="E.g., 'Create a flowchart for user authentication process' or 'Generate a sequence diagram for API calls'"
          style={{ fontSize: 13 }}
        />
      </div>

  {/* Quick examples removed - editor is the single source for mermaid code */}

      {/* Action Buttons */}
      <div className="mb-3 d-flex gap-2">
        <button
          className="btn btn-sm btn-primary"
          onClick={generateMermaid}
          disabled={loading || !apiKey || !userInput}
        >
          {loading ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-1"
                role="status"
                aria-hidden="true"
              ></span>
              Generating...
            </>
          ) : (
            <>
              <i className="bi bi-magic me-1"></i>
              Generate Mermaid
            </>
          )}
        </button>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={clearResponse}
          disabled={loading}
        >
          Clear
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-danger alert-sm py-2" role="alert">
          <i className="bi bi-exclamation-triangle me-1"></i>
          {error}
        </div>
      )}


  
    </div>
  );
}
