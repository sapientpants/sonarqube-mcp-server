Below is a **self-contained, step-by-step test plan** you can execute entirely on your MacBook Pro.
It is organised so you can run each suite independently, yet all suites share one bootstrap script (≈5 min) that installs everything you need via Homebrew.

---

## 1  Prerequisites

| Need                        | Recommended version                                                                              | Quick-install                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Homebrew                    | latest                                                                                           | `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"` |
| Docker Desktop              | ≥ 4.30                                                                                           | `brew install --cask docker`                                                                      |
| kind (Kubernetes-in-Docker) | ≥ 0.23                                                                                           | `brew install kind`                                                                               |
| kubectl                     | match Docker Desktop k8s                                                                         | `brew install kubernetes-cli`                                                                     |
| Helm                        | ≥ 3.15                                                                                           | `brew install helm`                                                                               |
| Terraform                   | ≥ 1.9                                                                                            | `brew tap hashicorp/tap && brew install hashicorp/tap/terraform`                                  |
| CLI helpers                 | `trivy`, `markdownlint-cli`, `linkinator`, `kubeval`, `conftest`, `tfsec`, `checkov`, `jq`, `yq` | bundle install script (next section)                                                              |

<details>
<summary>Bootstrap script (copy-paste)</summary>

```bash
#!/usr/bin/env bash
set -e
brew update
brew install \
  kind kubernetes-cli helm terraform \
  trivy markdownlint-cli linkinator kubeval conftest tfsec checkov jq yq
npm install -g @marp-team/marp-cli markdown-link-check
pip3 install --user kube-hunter jwt-cli >/dev/null
echo "✅ Toolchain ready"
```

</details>

---

## 2  Repository setup

```bash
git clone <your-fork-url> sonarqube-mcp
cd sonarqube-mcp
git checkout feature/issue-183-docs-and-deploy
```

---

## 3  Test Suites

### 3.1  Documentation Quality

| Objective                                                                                        | Steps (run at repo root)                             | Pass criteria                |           |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ---------------------------- | --------- |
| Lint & broken links                                                                              | `markdownlint **/*.md`<br>`linkinator docs --silent` | No errors/warnings           |           |
| ADR & Mermaid diagrams render                                                                    | `marp --html docs/architecture.md -o /tmp/arch.html` | HTML opens with all diagrams |           |
| Reference completeness                                                                           | \`grep -R "TBD" docs                                 | wc -l\`                      | Returns 0 |
| These steps validate the seven new guides and the README additions described in the change log.  |                                                      |                              |           |

---

### 3.2  Docker Image

| Objective                | Steps                                                                        | Expected                         |
| ------------------------ | ---------------------------------------------------------------------------- | -------------------------------- |
| Build succeeds           | `docker build -t mcp:local .`                                                | Image tagged                     |
| Runs as non-root         | `docker run -d -p 3000:3000 --name mcp mcp:local`<br>`docker exec mcp id -u` | UID = 1001 (matches Dockerfile)  |
| Health check wired       | `curl -f http://localhost:3000/health`                                       | HTTP 200 ✔                       |
| Security scan            | `trivy image mcp:local`                                                      | No CRITICAL vulns                |
| Dockerfile best-practice | `dockle --exit-code 1 mcp:local`                                             | Exit 0                           |

---

### 3.3  Local Kubernetes Manifests (k8s/)

1. **Create cluster**

```bash
kind create cluster --name mcp --image kindest/node:v1.30.0
kubectl cluster-info --context kind-mcp
```

2. **Deploy base overlay**

```bash
kubectl apply -k k8s/base
kubectl rollout status deploy/sonarqube-mcp -n sonarqube-mcp
```

3. **Automated checks**

| Check        | Command                                                        |
| ------------ | -------------------------------------------------------------- |
| YAML schema  | `kubeval --strict --kubernetes-version 1.30.0 k8s/base/*.yaml` |
| Policy tests | `conftest test k8s/base`                                       |
| Pod security | `kubectl get deployment -o=jsonpath='{..securityContext}'`     |

4. **Runtime tests**

```bash
kubectl port-forward svc/sonarqube-mcp 3000:3000 -n sonarqube-mcp &
curl -f http://localhost:3000/health
kubectl top pods -n sonarqube-mcp   # requires metrics-server
```

> **HPA simulation**

```
kubectl run load --image=busybox -- /bin/sh -c "while true; do wget -q -O- svc/sonarqube-mcp:3000/health; done"
watch kubectl get hpa -n sonarqube-mcp
```

Expected: HPA scales replicas from 3 → ≥4 when CPU>50 %. Manifest includes proper HPA & PDB.&#x20;

---

### 3.4  Helm Chart (`helm/sonarqube-mcp/`)

| Step              | Command                                                                               | Expectation                    |                 |
| ----------------- | ------------------------------------------------------------------------------------- | ------------------------------ | --------------- |
| Lint              | `helm lint helm/sonarqube-mcp`                                                        | 0 errors                       |                 |
| Render & validate | \`helm template test helm/sonarqube-mcp                                               | kubeval --strict\`             | 0 schema errors |
| Install on kind   | `helm install mcp helm/sonarqube-mcp --values helm/sonarqube-mcp/ci/values-kind.yaml` | Pods Ready                     |                 |
| Chart test hooks  | `helm test mcp`                                                                       | SUCCESS                        |                 |
| Upgrade path      | `helm upgrade mcp helm/sonarqube-mcp -f ...`                                          | No downtime, replicas stay ≥ 2 |                 |

Verify NOTES.txt post-install matches new docs.&#x20;

---

### 3.5  Terraform Modules (`terraform/aws`)

```bash
cd terraform/aws
terraform init
terraform validate
tfsec .
checkov -d .
terraform plan -var-file=tests/test.tfvars -out plan.out
```

Optional: spin up resources in **LocalStack**

```bash
SERVICES="iam,sts,cloudwatch" localstack start -d
export AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_REGION=us-east-1
terraform apply plan.out
```

Expect validate/plan green; static scanners show no HIGH / CRITICAL findings. Modules correspond to IAM, CloudWatch, IRSA additions.&#x20;

---

### 3.6  Security Configuration

| Scenario               | Tool/Command                                                                              | Result             |
| ---------------------- | ----------------------------------------------------------------------------------------- | ------------------ |
| Invalid JWT rejected   | `curl -H "Authorization: Bearer bad" http://localhost:3000/secure`                        | HTTP 401           |
| Valid JWT accepted     | `jwt encode --alg HS256 --secret secret '{ "sub":"demo","aud":"mcp" }'` → curl with token | HTTP 200           |
| NetworkPolicy enforced | Deploy busybox in default ns, try `wget mcp-service.sonarqube-mcp`                        | Connection refused |
| RBAC boundaries        | `kubectl auth can-i create pods --as system:serviceaccount:default:default`               | “no”               |

---

### 3.7  Performance & Scaling

1. **Load test**: `k6 run perf/load.js` (configure to 500 VU, 5 min).
2. Watch Grafana (import dashboard ID 1860) via Prometheus stack from manifests.
3. Pass if P95 latency < 250 ms and HPA stabilises.

---

### 3.8  Backup & Recovery Validation

* Port-forward Postgres (or your stateful store) and run `pg_dump` → verify dumps go to S3 bucket mock (LocalStack).
* Delete pod with `kubectl delete pod …` → new pod should mount same PVC and app startup healthy.

---

## 4  Regression Matrix (tracking sheet)

| Suite  | Test-ID | Status | Notes |
| ------ | ------- | ------ | ----- |
| DOC    | DOC-001 |        |       |
| Docker | DKR-001 |        |       |
| K8s    | K8S-003 |        |       |
| …      | …       | …      | …     |

Populate after each run; attach to PR.

---

## 5  Automation Tips

* Add **GitHub Actions** jobs that run:

  * `markdownlint`, `linkinator` (docs)
  * `yamllint`, `kubeval`, `conftest` (manifests)
  * `helm lint`, `helm template`
  * `trivy` scan on push
  * `tfsec` + `checkov` on Terraform
* Cache Docker layers to speed CI.

---

### You’re ready

Run suites 3.1 → 3.8 locally in roughly this order. The plan mirrors every artefact introduced in the branch so you can sign off the issue with confidence. Happy testing!
