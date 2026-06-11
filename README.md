# Status Page Backstage

Simple status page plugin for Backstage.

It adds a `/statuspage` page where users can see the health of platform
services, metrics, components, and recent incidents.

## Preview

The page gives a quick overview of the platform health, live-looking metrics,
component status, and uptime history.

![Status page overview](docs/images/statuspage-overview.png)

Users can also search incidents, see severity and status labels, and open each
incident to read more details.

![Status page incidents](docs/images/statuspage-incidents.png)

## What you get

- Global status banner
- API success rate
- API error rate
- Scheduler issues
- Kubernetes component status
- 90-day uptime history
- Metrics chart
- Searchable incident history
- Expandable incident details

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
