# Status Page Backstage

Simple status page plugin for Backstage.

It adds a `/statuspage` page where users can see live Prometheus metrics for
their Kubernetes platform.

## Preview

The page gives a quick overview of the platform health, Prometheus connection
status, live metrics, and Kubernetes component status.

When Prometheus is running, the page shows live values from
`http://localhost:9090`.

![Prometheus connected proof](docs/images/statuspage-prometheus-connected.png)

When Prometheus is stopped or unreachable, the page detects it and clearly shows
that the metrics source is disconnected.

![Prometheus unavailable proof](docs/images/statuspage-prometheus-unavailable.png)

## How it works

Prometheus collects metrics from the Kubernetes cluster. The Status Page plugin
uses the configured Prometheus URL to query these metrics and display them in
Backstage.

![Prometheus and Backstage flow](docs/images/prometheus-backstage-flow.png)

In the current plugin, Prometheus powers the overall status, success/error
metrics, scheduler metrics, ready node count, and charts. Incident data can be
added later by connecting an incident provider or a custom backend API.

## What you get

- Global status banner
- API success rate
- API error rate
- Scheduler issues
- Kubernetes component status
- Metrics chart
- Prometheus connection badge
- Prometheus unavailable state

The metrics come directly from Prometheus. The Prometheus URL is configurable,
so the plugin can work on a local laptop, a VM, a container, or with a remote
Prometheus server.

By default, the plugin reads Prometheus from:

```text
http://localhost:9090
```

It uses the Prometheus HTTP API, for example
`/api/v1/query` and `/api/v1/query_range`.

## Install

From your Backstage repository, install the plugin in your app:

```shell
yarn workspace app add NizmoDev/Status-Page-BackStage
```

If your frontend app package is not named `app`, replace `app` with your app
workspace name.

## Configure Prometheus

Add this to your Backstage `app-config.yaml`:

```yaml
statuspage:
  prometheusUrl: ${PROMETHEUS_URL}
```

Then set the environment variable before starting Backstage.

For a local Prometheus:

```shell
export PROMETHEUS_URL=http://localhost:9090
yarn start
```

For a remote Prometheus:

```shell
export PROMETHEUS_URL=https://prometheus.example.com
yarn start
```

On Windows PowerShell:

```powershell
$env:PROMETHEUS_URL = "http://localhost:9090"
yarn start
```

The plugin reads this Backstage config value:

```yaml
statuspage.prometheusUrl
```

You can also set the URL directly without an environment variable:

```yaml
statuspage:
  prometheusUrl: http://localhost:9090
```

If `statuspage.prometheusUrl` is not set, the plugin falls back to
`http://localhost:9090`.

## Use with the new Backstage frontend system

Open your app entry point and add the plugin to `createApp`.

```ts
import statuspagePlugin from "status-page-backstage";

const app = createApp({
  features: [statuspagePlugin],
});
```

Then start Backstage and open:

```text
http://localhost:3000/statuspage
```

## Use with classic routes

If your app still uses React routes, add the page manually.

```tsx
import { StatusPagePage } from "status-page-backstage";

<Route path="/statuspage" element={<StatusPagePage />} />;
```

## Local development

Clone this repository, install dependencies, and start the plugin:

```shell
yarn install
yarn start
```

Make sure Prometheus is also running locally:

```text
http://localhost:9090
```

You can also use a remote URL by setting:

```shell
export PROMETHEUS_URL=https://prometheus.example.com
```

## Prometheus metrics

The page uses these metrics:

- `apiserver_request_total`
- `scheduler_schedule_attempts_total`
- `kube_node_status_condition`
- `kube_node_info`

The API cards and chart are refreshed every 5 minutes.

## How to check that Prometheus is used

Open the status page and look at the badge under the title:

```text
Prometheus connected: http://localhost:9090
```

If Prometheus is stopped or unreachable, the badge changes to disconnected and
the main banner shows `Prometheus unavailable`.

You can also compare the values with Prometheus directly:

```shell
curl "http://localhost:9090/api/v1/query?query=up"
```

## Remote Prometheus and CORS

The plugin runs in the browser, so direct remote Prometheus URLs must allow
browser requests from your Backstage frontend origin.

If your Prometheus server does not allow CORS, use the Backstage proxy instead:

```yaml
proxy:
  endpoints:
    /prometheus:
      target: ${PROMETHEUS_URL}
      changeOrigin: true

statuspage:
  prometheusUrl: /api/proxy/prometheus
```

Then set:

```shell
export PROMETHEUS_URL=https://prometheus.example.com
```

With this setup, the browser calls Backstage, and Backstage forwards the request
to Prometheus.

## Customize Prometheus queries

The Prometheus URL and queries are in:

```text
src/components/StatusPagePage.tsx
```

Change the `PROMETHEUS_QUERIES` object if your Prometheus metrics use different
names or labels.
