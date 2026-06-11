import React, { useEffect, useMemo, useState } from 'react';
import { Page, Content } from '@backstage/core-components';
import {
  Box,
  Button,
  Chip,
  Collapse,
  Container,
  Grid,
  TextField,
  Typography,
  makeStyles,
} from '@material-ui/core';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import WarningIcon from '@material-ui/icons/Warning';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const useStyles = makeStyles(theme => ({
  page: { minHeight: '100vh', paddingBottom: theme.spacing(6) },
  header: { padding: theme.spacing(5, 0, 3) },
  logo: { fontSize: 30, fontWeight: 700 },
  muted: { color: theme.palette.text.secondary },
  banner: {
    background: '#28a745',
    color: '#fff',
    borderRadius: 6,
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
    display: 'flex',
    gap: theme.spacing(2),
    alignItems: 'center',
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
    display: 'flex',
    justifyContent: 'space-between',
    gap: theme.spacing(2),
    alignItems: 'center',
  },
  metric: { padding: theme.spacing(2) },
  chartBox: {
    width: '100%',
    height: 320,
    marginTop: theme.spacing(2),
  },
  history: {
    display: 'flex',
    gap: 3,
    marginTop: theme.spacing(1),
  },
  day: {
    flex: 1,
    height: 28,
    borderRadius: 2,
    background: '#28a745',
    minWidth: 5,
  },
  warn: { background: '#f9c74f' },
  error: { background: '#dc3545' },
  incidentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: theme.spacing(2),
    alignItems: 'center',
    cursor: 'pointer',
  },
  incidentDetails: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    borderRadius: 6,
    background: theme.palette.background.default,
  },
  searchBox: {
    padding: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  pagination: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(2),
  },
}));

type MetricPoint = {
  time: string;
  successRate: number;
  errorRate: number;
  schedulerIssues: number;
};

type Incident = {
  id: number;
  title: string;
  date: string;
  status: 'Resolved' | 'Monitoring' | 'Investigating';
  severity: 'Minor' | 'Major' | 'Critical';
  component: string;
  summary: string;
  timeline: string[];
};

const START_DATE = new Date('2026-06-10');

const today = new Date();

const daysRunning = Math.max(
  1,
  Math.ceil(
    (today.getTime() - START_DATE.getTime()) / (1000 * 60 * 60 * 24),
  ),
);

const formatTime = (date = new Date()) =>
  date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

const createMetricPoint = (date = new Date()): MetricPoint => {
  const errorRate = Number((Math.random() * 3 + 0.5).toFixed(2));
  const schedulerIssues = Number((Math.random() * 4 + 1).toFixed(2));
  const successRate = Number((100 - errorRate).toFixed(2));

  return {
    time: formatTime(date),
    successRate,
    errorRate,
    schedulerIssues,
  };
};

const createInitialMetricData = (): MetricPoint[] => {
  const now = new Date();

  return Array.from({ length: 8 }).map((_, index) => {
    const date = new Date(now.getTime() - (7 - index) * 5 * 60 * 1000);
    return createMetricPoint(date);
  });
};

const services = [
  {
    name: 'Kubernetes API Server',
    status: 'Operational',
    detail: 'Success rate and error rate from API Server requests',
    query:
      'apiserver_request_total{code=~"(2).."} / apiserver_request_total{code=~"(4|5).."}',
    history: 'good',
  },
  {
    name: 'Kubernetes Nodes',
    status: 'Degraded Performance',
    detail: '2/3 nodes ready',
    query: 'kube_node_status_condition{condition="Ready"}',
    history: 'warn',
  },
  {
    name: 'Scheduler',
    status: 'Operational',
    detail: 'Unschedulable scheduling attempts ratio',
    query: 'scheduler_schedule_attempts_total',
    history: 'good',
  },
];

const incidents: Incident[] = [
  {
    id: 1,
    title: 'API Server elevated error rate',
    date: '2026-06-11 14:20',
    status: 'Resolved',
    severity: 'Minor',
    component: 'Kubernetes API Server',
    summary:
      'A temporary increase of 4xx/5xx responses was detected on the API Server.',
    timeline: [
      '14:20 - Elevated error rate detected.',
      '14:27 - Error rate started decreasing.',
      '14:35 - Service returned to normal.',
    ],
  },
  {
    id: 2,
    title: 'Node readiness degradation',
    date: '2026-06-11 13:10',
    status: 'Monitoring',
    severity: 'Major',
    component: 'Kubernetes Nodes',
    summary:
      'One node reported NotReady for several minutes before recovering.',
    timeline: [
      '13:10 - node-3 reported NotReady.',
      '13:15 - kubelet restarted successfully.',
      '13:25 - Node returned to Ready state.',
    ],
  },
  {
    id: 3,
    title: 'Scheduler unschedulable attempts increased',
    date: '2026-06-10 18:40',
    status: 'Resolved',
    severity: 'Minor',
    component: 'Scheduler',
    summary:
      'The scheduler reported a higher ratio of unschedulable pods due to resource pressure.',
    timeline: [
      '18:40 - Unschedulable ratio exceeded threshold.',
      '18:55 - Cluster autoscaler added capacity.',
      '19:05 - Scheduler ratio returned to normal.',
    ],
  },
  {
    id: 4,
    title: 'Prometheus scrape delay',
    date: '2026-06-10 16:05',
    status: 'Resolved',
    severity: 'Minor',
    component: 'Monitoring',
    summary: 'Prometheus scrape latency increased temporarily.',
    timeline: [
      '16:05 - Scrape duration increased.',
      '16:12 - Monitoring target recovered.',
      '16:20 - Metrics ingestion normalized.',
    ],
  },
  {
    id: 5,
    title: 'Grafana dashboard loading slowly',
    date: '2026-06-10 15:15',
    status: 'Resolved',
    severity: 'Minor',
    component: 'Grafana',
    summary: 'Some dashboards took longer than usual to load.',
    timeline: [
      '15:15 - Slow dashboard loading detected.',
      '15:22 - Query load reduced.',
      '15:30 - Dashboard performance normalized.',
    ],
  },
  {
    id: 6,
    title: 'Temporary network latency',
    date: '2026-06-09 22:45',
    status: 'Resolved',
    severity: 'Major',
    component: 'Cluster Networking',
    summary: 'Inter-node network latency briefly increased.',
    timeline: [
      '22:45 - Network latency alert triggered.',
      '22:52 - Packet loss reduced.',
      '23:05 - Network stable.',
    ],
  },
  {
    id: 7,
    title: 'Kubelet restart on worker node',
    date: '2026-06-09 20:10',
    status: 'Resolved',
    severity: 'Minor',
    component: 'Kubernetes Nodes',
    summary: 'A kubelet process restarted on one worker node.',
    timeline: [
      '20:10 - kubelet restart detected.',
      '20:13 - Node remained Ready.',
      '20:20 - No impact detected.',
    ],
  },
  {
    id: 8,
    title: 'API latency spike',
    date: '2026-06-09 17:30',
    status: 'Resolved',
    severity: 'Minor',
    component: 'Kubernetes API Server',
    summary: 'API latency increased for a short period.',
    timeline: [
      '17:30 - API latency increased.',
      '17:38 - Request latency decreased.',
      '17:45 - Latency back to normal.',
    ],
  },
  {
    id: 9,
    title: 'Pod scheduling delay',
    date: '2026-06-09 12:25',
    status: 'Resolved',
    severity: 'Minor',
    component: 'Scheduler',
    summary: 'New pods were scheduled slower than usual.',
    timeline: [
      '12:25 - Scheduling delay detected.',
      '12:32 - Pending pod count decreased.',
      '12:40 - Scheduling normalized.',
    ],
  },
  {
    id: 10,
    title: 'Metrics gap detected',
    date: '2026-06-08 23:50',
    status: 'Resolved',
    severity: 'Minor',
    component: 'Monitoring',
    summary: 'A short metrics gap was detected in Prometheus data.',
    timeline: [
      '23:50 - Metrics gap detected.',
      '23:55 - Scraping restored.',
      '00:05 - Gap confirmed resolved.',
    ],
  },
  {
    id: 11,
    title: 'Container image pull delay',
    date: '2026-06-08 19:35',
    status: 'Resolved',
    severity: 'Minor',
    component: 'Container Runtime',
    summary: 'Some workloads experienced image pull delays.',
    timeline: [
      '19:35 - Image pull delay detected.',
      '19:42 - Registry response time improved.',
      '19:50 - Pull operations normalized.',
    ],
  },
  {
    id: 12,
    title: 'Cluster DNS latency',
    date: '2026-06-08 11:10',
    status: 'Resolved',
    severity: 'Major',
    component: 'CoreDNS',
    summary: 'DNS resolution latency increased for internal services.',
    timeline: [
      '11:10 - DNS latency alert triggered.',
      '11:18 - CoreDNS pods restarted.',
      '11:30 - DNS latency normalized.',
    ],
  },
];

const getSeverityColor = (severity: Incident['severity']) => {
  if (severity === 'Critical') {
    return 'secondary';
  }

  if (severity === 'Major') {
    return 'secondary';
  }

  return 'primary';
};

export const StatusPagePage = () => {
  const classes = useStyles();

  const [apiData, setApiData] = useState<MetricPoint[]>(
    createInitialMetricData,
  );
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [openedIncidentId, setOpenedIncidentId] = useState<number | null>(null);

  const latestMetric = apiData[apiData.length - 1];

  const incidentsPerPage = 10;

  const filteredIncidents = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    if (!normalizedSearch) {
      return incidents;
    }

    return incidents.filter(incident =>
      [
        incident.title,
        incident.status,
        incident.severity,
        incident.component,
        incident.summary,
        incident.date,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredIncidents.length / incidentsPerPage),
  );

  const paginatedIncidents = filteredIncidents.slice(
    page * incidentsPerPage,
    page * incidentsPerPage + incidentsPerPage,
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setApiData(currentData => [
        ...currentData.slice(-7),
        createMetricPoint(),
      ]);
    }, 5 * 60 * 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setPage(0);
  }, [search]);

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
            </Box>

            <Box className={classes.banner}>
              <CheckCircleIcon fontSize="large" />
              <Box>
                <Typography variant="h5">All systems operational</Typography>
                <Typography>Last refresh: {latestMetric.time}</Typography>
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

              {services.map(service => (
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
                        service.status === 'Operational' ? (
                          <CheckCircleIcon />
                        ) : (
                          <WarningIcon />
                        )
                      }
                      label={service.status}
                      color={
                        service.status === 'Operational'
                          ? 'primary'
                          : 'secondary'
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
                        <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2ea043" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#2ea043" stopOpacity={0.02} />
                        </linearGradient>

                        <linearGradient id="errorGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f85149" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#f85149" stopOpacity={0.02} />
                        </linearGradient>

                        <linearGradient id="schedulerGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a371f7" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#a371f7" stopOpacity={0.02} />
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

            <Box className={classes.section}>
              <Typography className={classes.sectionHeader}>
                Uptime history
              </Typography>

              {services.map(service => (
                <Box key={service.name} className={classes.row}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                      <Typography>{service.name}</Typography>
                    </Grid>

                    <Grid item xs={12} md={9}>
                      <Box className={classes.history}>
                        {Array.from({ length: daysRunning }).map((_, index) => (
                          <Box
                            key={index}
                            className={[
                              classes.day,
                              service.history === 'warn' &&
                              index >= Math.max(daysRunning - 2, 0)
                                ? classes.warn
                                : '',
                              service.history === 'error' &&
                              index >= Math.max(daysRunning - 1, 0)
                                ? classes.error
                                : '',
                            ].join(' ')}
                          />
                        ))}
                      </Box>

                      <Typography className={classes.muted}>
                        {daysRunning === 1
                          ? 'Today'
                          : `${daysRunning} days ago → Today`}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              ))}
            </Box>

            <Box className={classes.section}>
              <Typography className={classes.sectionHeader}>
                Recent incidents
              </Typography>

              <Box className={classes.searchBox}>
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  label="Search incidents"
                  placeholder="Search by title, component, severity, status..."
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                />
              </Box>

              {paginatedIncidents.length === 0 ? (
                <Box className={classes.row}>
                  <Typography variant="h6">No incidents found.</Typography>
                  <Typography className={classes.muted}>
                    Try another search term.
                  </Typography>
                </Box>
              ) : (
                paginatedIncidents.map(incident => {
                  const isOpen = openedIncidentId === incident.id;

                  return (
                    <Box key={incident.id} className={classes.row}>
                      <Box
                        className={classes.incidentHeader}
                        onClick={() =>
                          setOpenedIncidentId(isOpen ? null : incident.id)
                        }
                      >
                        <Box>
                          <Typography variant="h6">{incident.title}</Typography>
                          <Typography className={classes.muted}>
                            {incident.date} · {incident.component}
                          </Typography>
                        </Box>

                        <Box display="flex" alignItems="center" gridGap={8}>
                          <Chip
                            size="small"
                            label={incident.severity}
                            color={getSeverityColor(incident.severity)}
                          />
                          <Chip size="small" label={incident.status} />
                          {isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </Box>
                      </Box>

                      <Collapse in={isOpen}>
                        <Box className={classes.incidentDetails}>
                          <Typography>{incident.summary}</Typography>

                          <Box mt={2}>
                            <Typography variant="subtitle2">Timeline</Typography>
                            {incident.timeline.map(entry => (
                              <Typography
                                key={entry}
                                className={classes.muted}
                              >
                                • {entry}
                              </Typography>
                            ))}
                          </Box>
                        </Box>
                      </Collapse>
                    </Box>
                  );
                })
              )}

              <Box className={classes.pagination}>
                <Button
                  variant="outlined"
                  disabled={page === 0}
                  onClick={() => setPage(current => Math.max(current - 1, 0))}
                >
                  Previous
                </Button>

                <Typography className={classes.muted}>
                  Page {page + 1} / {totalPages} · {filteredIncidents.length}{' '}
                  incident(s)
                </Typography>

                <Button
                  variant="outlined"
                  disabled={page + 1 >= totalPages}
                  onClick={() =>
                    setPage(current => Math.min(current + 1, totalPages - 1))
                  }
                >
                  Next
                </Button>
              </Box>
            </Box>
          </Container>
        </Box>
      </Content>
    </Page>
  );
};