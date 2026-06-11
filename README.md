# Status Page Backstage

Simple status page plugin for Backstage.

It adds a `/statuspage` page where users can see live Prometheus metrics for
their Kubernetes platform.

## Preview

The page gives a quick overview of the platform health, Prometheus connection
status, live metrics, and Kubernetes component status.

When Prometheus is stopped or unreachable, the page detects it and clearly shows
that the metrics source is disconnected.

![Prometheus unavailable proof](docs/images/statuspage-prometheus-unavailable.png)

## What you get

- Global status banner
- API success rate
- API error rate
- Scheduler issues
- Kubernetes component status
- Metrics chart
- Prometheus connection badge
- Prometheus unavailable state

The metrics come directly from Prometheus. By default, the plugin reads
Prometheus from:

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

## Customize Prometheus

The Prometheus URL and queries are in:

```text
src/components/StatusPagePage.tsx
```

Change `PROMETHEUS_BASE_URL` if your Prometheus instance is not available at
`http://localhost:9090`.
