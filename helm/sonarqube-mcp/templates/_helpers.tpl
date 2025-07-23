{{/*
Expand the name of the chart.
*/}}
{{- define "sonarqube-mcp.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "sonarqube-mcp.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "sonarqube-mcp.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "sonarqube-mcp.labels" -}}
helm.sh/chart: {{ include "sonarqube-mcp.chart" . }}
{{ include "sonarqube-mcp.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "sonarqube-mcp.selectorLabels" -}}
app.kubernetes.io/name: {{ include "sonarqube-mcp.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "sonarqube-mcp.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "sonarqube-mcp.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Create secret name for SonarQube token
*/}}
{{- define "sonarqube-mcp.sonarqubeTokenSecretName" -}}
{{- if .Values.existingSecrets.sonarqubeToken }}
{{- .Values.existingSecrets.sonarqubeToken }}
{{- else }}
{{- include "sonarqube-mcp.fullname" . }}-sonarqube-token
{{- end }}
{{- end }}

{{/*
Create secret name for service accounts
*/}}
{{- define "sonarqube-mcp.serviceAccountsSecretName" -}}
{{- if .Values.existingSecrets.serviceAccounts }}
{{- .Values.existingSecrets.serviceAccounts }}
{{- else }}
{{- include "sonarqube-mcp.fullname" . }}-service-accounts
{{- end }}
{{- end }}

{{/*
Create secret name for OAuth public key
*/}}
{{- define "sonarqube-mcp.oauthSecretName" -}}
{{- if .Values.existingSecrets.oauthPublicKey }}
{{- .Values.existingSecrets.oauthPublicKey }}
{{- else }}
{{- include "sonarqube-mcp.fullname" . }}-oauth
{{- end }}
{{- end }}

{{/*
Create secret name for TLS
*/}}
{{- define "sonarqube-mcp.tlsSecretName" -}}
{{- if .Values.existingSecrets.tls }}
{{- .Values.existingSecrets.tls }}
{{- else }}
{{- include "sonarqube-mcp.fullname" . }}-tls
{{- end }}
{{- end }}