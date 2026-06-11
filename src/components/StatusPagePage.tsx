import { useEffect, useMemo, useState } from "react";
import { Page, Content } from "@backstage/core-components";
import {
  Box,
  Chip,
  Container,
  Grid,
  Typography,
  makeStyles,
} from "@material-ui/core";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import WarningIcon from "@material-ui/icons/Warning";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

const useStyles = makeStyles((theme) => ({
  page: { minHeight: "100vh", paddingBottom: theme.spacing(6) },
  header: { padding: theme.spacing(5, 0, 3) },
  logo: { fontSize: 30, fontWeight: 700 },
  muted: { color: theme.palette.text.secondary },
  sourceStatus: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1),
    alignItems: "center",
    marginTop: theme.spacing(1),
  },
  banner: {
    background: "#28a745",
    color: "#fff",
    borderRadius: 6,
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
    display: "flex",
    gap: theme.spacing(2),
    alignItems: "center",
  },
  bannerWarning: {
    background: "#b45309",
  },
  section: {
    background: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 6,
    marginBottom: theme.spacing(3),
  },
  sectionHeader: {
    padding: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    fontWeight: 700,
  },
  row: {
    padding: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  serviceLine: {
    display: "flex",
    justifyContent: "space-between",
    gap: theme.spacing(2),
    alignItems: "center",
  },
  metric: { padding: theme.spacing(2) },
  chartBox: {
    width: "100%",
    height: 320,
    marginTop: theme.spacing(2),
  },
}));

type MetricPoint = {
  time: string;
  successRate: number;
  errorRate: number;
  schedulerIssues: number;
};

type NodeHealth = {
  ready: number;
  total: number;
};

type PrometheusValue = [number, string];

type PrometheusQueryResult = {
  metric: Record<string, string>;
  value?: PrometheusValue;
  values?: PrometheusValue[];
};

type PrometheusResponse = {
  status: "success" | "error";
  data?: {
    result: PrometheusQueryResult[];
  };
  error?: string;
};

const PROMETHEUS_BASE_URL = "http://localhost:9090";

const PROMETHEUS_QUERIES = {
  successRate:
    '100 * sum(rate(apiserver_request_total{code=~"2.."}[5m])) / clamp_min(sum(rate(apiserver_request_total[5m])), 1) or vector(0)',
  errorRate:
    '100 * sum(rate(apiserver_request_total{code=~"(4|5).."}[5m])) / clamp_min(sum(rate(apiserver_request_total[5m])), 1) or vector(0)',
  schedulerIssues:
    '100 * sum(rate(scheduler_schedule_attempts_total{result="unschedulable"}[5m])) / clamp_min(sum(rate(scheduler_schedule_attempts_total[5m])), 1) or vector(0)',
  readyNodes:
    'sum(kube_node_status_condition{condition="Ready",status="true"}) or vector(0)',
  totalNodes: "count(kube_node_info) or vector(0)",
};

const formatTime = (date = new Date()) =>
  date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

const createEmptyMetricPoint = (date = new Date()): MetricPoint => ({
  time: formatTime(date),
  successRate: 0,
  errorRate: 0,
  schedulerIssues: 0,
});

const createInitialMetricData = (): MetricPoint[] => {
  const now = new Date();

  return Array.from({ length: 8 }).map((_, index) => {
    const date = new Date(now.getTime() - (7 - index) * 5 * 60 * 1000);
    return createEmptyMetricPoint(date);
  });
};

const formatMetricValue = (value: number) => Number(value.toFixed(2));

const getPrometheusUrl = (
  endpoint: "query" | "query_range",
  params: Record<string, string | number>
) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    searchParams.set(key, String(value));
  });

  return `${PROMETHEUS_BASE_URL}/api/v1/${endpoint}?${searchParams}`;
};

const fetchPrometheus = async (
  endpoint: "query" | "query_range",
  params: Record<string, string | number>
) => {
  const response = await fetch(getPrometheusUrl(endpoint, params));

  if (!response.ok) {
    throw new Error(
      `Prometheus request failed: ${response.status} ${response.statusText}`
    );
  }

  const payload = (await response.json()) as PrometheusResponse;

  if (payload.status !== "success") {
    throw new Error(payload.error ?? "Prometheus returned an error");
  }

  return payload.data?.result ?? [];
};

const fetchPrometheusValue = async (query: string) => {
  const result = await fetchPrometheus("query", { query });
  const rawValue = result[0]?.value?.[1];
  const value = Number(rawValue);

  return Number.isFinite(value) ? value : 0;
};

const fetchPrometheusRange = async (query: string) => {
  const end = Math.floor(Date.now() / 1000);
  const start = end - 35 * 60;
  const result = await fetchPrometheus("query_range", {
    query,
    start,
    end,
    step: 5 * 60,
  });

  return result[0]?.values ?? [];
};

const mergeMetricRanges = (
  successValues: PrometheusValue[],
  errorValues: PrometheusValue[],
  schedulerValues: PrometheusValue[]
): MetricPoint[] => {
  const timestamps = Array.from(
    new Set([
      ...successValues.map(([timestamp]) => timestamp),
      ...errorValues.map(([timestamp]) => timestamp),
      ...schedulerValues.map(([timestamp]) => timestamp),
    ])
  ).sort((a, b) => a - b);

  if (timestamps.length === 0) {
    return createInitialMetricData();
  }

  const valueByTimestamp = (values: PrometheusValue[]) =>
    new Map(values.map(([timestamp, value]) => [timestamp, Number(value)]));

  const successByTimestamp = valueByTimestamp(successValues);
  const errorByTimestamp = valueByTimestamp(errorValues);
  const schedulerByTimestamp = valueByTimestamp(schedulerValues);

  return timestamps.slice(-8).map((timestamp) => ({
    time: formatTime(new Date(timestamp * 1000)),
    successRate: formatMetricValue(successByTimestamp.get(timestamp) ?? 0),
    errorRate: formatMetricValue(errorByTimestamp.get(timestamp) ?? 0),
    schedulerIssues: formatMetricValue(
      schedulerByTimestamp.get(timestamp) ?? 0
    ),
  }));
};

const serviceDefinitions = [
  {
    name: "Kubernetes API Server",
    detail: "Success rate and error rate from API Server requests",
    query: "rate(apiserver_request_total[5m]) grouped by response code",
  },
  {
    name: "Kubernetes Nodes",
    detail: "Ready nodes reported by kube-state-metrics",
    query: 'kube_node_status_condition{condition="Ready"}',
  },
  {
    name: "Scheduler",
    detail: "Unschedulable scheduling attempts ratio",
    query: "scheduler_schedule_attempts_total",
  },
];

export const StatusPagePage = () => {
  const classes = useStyles();

  const [apiData, setApiData] = useState<MetricPoint[]>(
    createInitialMetricData
  );
  const [nodeHealth, setNodeHealth] = useState<NodeHealth>({
    ready: 0,
    total: 0,
  });
  const [prometheusError, setPrometheusError] = useState<string | null>(null);

  const latestMetric = apiData[apiData.length - 1];
  const hasPrometheusError = Boolean(prometheusError);
  const hasPlatformIssue =
    latestMetric.errorRate > 5 ||
    latestMetric.schedulerIssues > 5 ||
    (nodeHealth.total > 0 && nodeHealth.ready < nodeHealth.total);

  const services = useMemo(
    () =>
      serviceDefinitions.map((service) => {
        if (service.name === "Kubernetes API Server") {
          return {
            ...service,
            status:
              latestMetric.errorRate > 5
                ? "Degraded Performance"
                : "Operational",
          };
        }

        if (service.name === "Kubernetes Nodes") {
          const hasNodeIssue =
            nodeHealth.total > 0 && nodeHealth.ready < nodeHealth.total;

          return {
            ...service,
            detail:
              nodeHealth.total > 0
                ? `${nodeHealth.ready}/${nodeHealth.total} nodes ready`
                : service.detail,
            status: hasNodeIssue ? "Degraded Performance" : "Operational",
          };
        }

        return {
          ...service,
          status:
            latestMetric.schedulerIssues > 5
              ? "Degraded Performance"
              : "Operational",
        };
      }),
    [latestMetric.errorRate, latestMetric.schedulerIssues, nodeHealth]
  );

  useEffect(() => {
    const refreshMetrics = async () => {
      try {
        const [
          successValues,
          errorValues,
          schedulerValues,
          readyNodes,
          totalNodes,
        ] = await Promise.all([
          fetchPrometheusRange(PROMETHEUS_QUERIES.successRate),
          fetchPrometheusRange(PROMETHEUS_QUERIES.errorRate),
          fetchPrometheusRange(PROMETHEUS_QUERIES.schedulerIssues),
          fetchPrometheusValue(PROMETHEUS_QUERIES.readyNodes),
          fetchPrometheusValue(PROMETHEUS_QUERIES.totalNodes),
        ]);

        setApiData(
          mergeMetricRanges(successValues, errorValues, schedulerValues)
        );
        setNodeHealth({
          ready: Math.round(readyNodes),
          total: Math.round(totalNodes),
        });
        setPrometheusError(null);
      } catch (error) {
        setPrometheusError(
          error instanceof Error
            ? error.message
            : "Unable to fetch Prometheus metrics"
        );
      }
    };

    refreshMetrics();

    const interval = window.setInterval(refreshMetrics, 5 * 60 * 1000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <Page themeId="tool">
      <Content>
        <Box className={classes.page}>
          <Container maxWidth="md">
            <Box className={classes.header}>
              <Typography className={classes.logo}>Status Page</Typography>
              <Typography className={classes.muted}>
                Kubernetes platform status
              </Typography>
              <Box className={classes.sourceStatus}>
                <Chip
                  size="small"
                  label={
                    hasPrometheusError
                      ? `Prometheus disconnected: ${PROMETHEUS_BASE_URL}`
                      : `Prometheus connected: ${PROMETHEUS_BASE_URL}`
                  }
                  color={hasPrometheusError ? "secondary" : "primary"}
                />
                <Typography className={classes.muted}>
                  Metrics loaded from `/api/v1/query` and `/api/v1/query_range`.
                </Typography>
              </Box>
            </Box>

            <Box
              className={[
                classes.banner,
                hasPrometheusError || hasPlatformIssue
                  ? classes.bannerWarning
                  : "",
              ].join(" ")}
            >
              {hasPrometheusError || hasPlatformIssue ? (
                <WarningIcon fontSize="large" />
              ) : (
                <CheckCircleIcon fontSize="large" />
              )}
              <Box>
                <Typography variant="h5">
                  {hasPrometheusError
                    ? "Prometheus unavailable"
                    : hasPlatformIssue
                    ? "Some systems need attention"
                    : "All systems operational"}
                </Typography>
                <Typography>
                  {hasPrometheusError
                    ? prometheusError
                    : `Last refresh: ${latestMetric.time}`}
                </Typography>
              </Box>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Box className={classes.section}>
                  <Box className={classes.metric}>
                    <Typography className={classes.muted}>
                      API success rate
                    </Typography>
                    <Typography variant="h4">
                      {latestMetric.successRate}%
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box className={classes.section}>
                  <Box className={classes.metric}>
                    <Typography className={classes.muted}>
                      API error rate
                    </Typography>
                    <Typography variant="h4">
                      {latestMetric.errorRate}%
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box className={classes.section}>
                  <Box className={classes.metric}>
                    <Typography className={classes.muted}>
                      Scheduler issues
                    </Typography>
                    <Typography variant="h4">
                      {latestMetric.schedulerIssues}%
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>

            <Box className={classes.section}>
              <Typography className={classes.sectionHeader}>
                Components
              </Typography>

              {services.map((service) => (
                <Box key={service.name} className={classes.row}>
                  <Box className={classes.serviceLine}>
                    <Box>
                      <Typography variant="h6">{service.name}</Typography>
                      <Typography className={classes.muted}>
                        {service.detail}
                      </Typography>
                      <Typography className={classes.muted}>
                        {service.query}
                      </Typography>
                    </Box>

                    <Chip
                      icon={
                        service.status === "Operational" ? (
                          <CheckCircleIcon />
                        ) : (
                          <WarningIcon />
                        )
                      }
                      label={service.status}
                      color={
                        service.status === "Operational"
                          ? "primary"
                          : "secondary"
                      }
                    />
                  </Box>
                </Box>
              ))}
            </Box>

            <Box className={classes.section}>
              <Typography className={classes.sectionHeader}>
                Platform metrics
              </Typography>

              <Box className={classes.row}>
                <Typography variant="h6">
                  API Server and Scheduler health
                </Typography>
                <Typography className={classes.muted}>
                  Auto-refresh every 5 minutes.
                </Typography>

                <Box className={classes.chartBox}>
                  <ResponsiveContainer>
                    <AreaChart data={apiData}>
                      <defs>
                        <linearGradient
                          id="successGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#2ea043"
                            stopOpacity={0.35}
                          />
                          <stop
                            offset="95%"
                            stopColor="#2ea043"
                            stopOpacity={0.02}
                          />
                        </linearGradient>

                        <linearGradient
                          id="errorGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#f85149"
                            stopOpacity={0.45}
                          />
                          <stop
                            offset="95%"
                            stopColor="#f85149"
                            stopOpacity={0.02}
                          />
                        </linearGradient>

                        <linearGradient
                          id="schedulerGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#a371f7"
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor="#a371f7"
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>

                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="time" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />

                      <Area
                        type="monotone"
                        dataKey="successRate"
                        name="Success rate %"
                        stroke="#2ea043"
                        fill="url(#successGradient)"
                        strokeWidth={3}
                        dot={false}
                      />

                      <Area
                        type="monotone"
                        dataKey="schedulerIssues"
                        name="Scheduler issues %"
                        stroke="#a371f7"
                        fill="url(#schedulerGradient)"
                        strokeWidth={3}
                        dot={false}
                      />

                      <Area
                        type="monotone"
                        dataKey="errorRate"
                        name="Error rate %"
                        stroke="#f85149"
                        fill="url(#errorGradient)"
                        strokeWidth={3}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            </Box>
          </Container>
        </Box>
      </Content>
    </Page>
  );
};
