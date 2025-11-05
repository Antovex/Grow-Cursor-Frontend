// src/pages/admin/TaskListPage.jsx
import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Chip,
  Checkbox,
  ListItemText,
  TextField,
  Button,
  Typography,
  Grid,
  Collapse,
  Badge,
  Divider,
  Stack,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import api from '../../lib/api.js';


const ITEM_HEIGHT = 44;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 6 + ITEM_PADDING_TOP,
      width: 280,
    },
  },
};

// --- IST-safe YYYY-MM-DD ---
const toISTYMD = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  const utc = dt.getTime() + dt.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 330 * 60000); // +05:30
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, '0');
  const day = String(ist.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const unique = (arr) => Array.from(new Set(arr.filter(Boolean)));

export default function TaskListPage() {
  const [items, setItems] = useState([]);
  const [openFilters, setOpenFilters] = useState(true); // toggle the collapse

  // ====== FILTER STATE ======
  const [filters, setFilters] = useState({
    date: { mode: 'none', single: '', from: '', to: '' }, // 'none' | 'single' | 'range'
    productTitle: { contains: '' },
    supplierLink: { contains: '' },
    sourcePrice: { min: '', max: '' },
    sellingPrice: { min: '', max: '' },
    sourcePlatform: { in: [] },   // .name
    range: { in: [] },
    category: { in: [] },
    createdByTask: { in: [] },    // task.createdBy.username
    listingPlatform: { in: [] },  // .name
    store: { in: [] },            // .name
    quantity: { min: '', max: '' },
    lister: { in: [] },           // row.lister.username
    sharedBy: { in: [] },         // row.createdBy.username  (assigner)
  });

  // ====== FIELD ACCESSORS (align with your render) ======
  const A = {
    date: (r) => r.createdAt,
    productTitle: (r) => r.task?.productTitle,
    supplierLink: (r) => r.task?.supplierLink,
    sourcePrice: (r) => Number(r.task?.sourcePrice),
    sellingPrice: (r) => Number(r.task?.sellingPrice),
    sourcePlatform: (r) => r.task?.sourcePlatform?.name,
    range: (r) => r.task?.range,
    category: (r) => r.task?.category,
    createdByTask: (r) => r.task?.createdBy?.username, // shown in "Created By" column
    listingPlatform: (r) => r.listingPlatform?.name,
    store: (r) => r.store?.name,
    quantity: (r) => Number(r.quantity),
    lister: (r) => r.lister?.username,
    sharedBy: (r) => r.createdBy?.username, // shown in "Shared By" column
    completedQuantity: (r) => Number(r.completedQuantity || 0), // present in /assignments API
  };

  // Quick helpers for pending & progress (per assignment row)
  const pendingQty = (r) => {
    const q = A.quantity(r);
    const c = A.completedQuantity(r);
    return Math.max(0, q - (Number.isFinite(c) ? c : 0));
  };
  const progressPct = (r) => {
    const q = A.quantity(r);
    if (!q || q <= 0) return 0;
    const c = Math.min(A.completedQuantity(r), q);
    return Math.round((c / q) * 100);
  };

  // ====== PREDICATES ======
  const matchesText = (val, contains) =>
    !contains || String(val ?? '').toLowerCase().includes(String(contains).toLowerCase());

  const matchesEnum = (val, arr) => !arr?.length || arr.includes(val);

  const matchesNum = (val, min, max) => {
    if (min === '' && max === '') return true;
    if (Number.isNaN(val)) return false;
    const okMin = min === '' || val >= Number(min);
    const okMax = max === '' || val <= Number(max);
    return okMin && okMax;
  };

  const matchesDate = (createdAt, dateFilter) => {
    const ymd = toISTYMD(createdAt);
    if (dateFilter.mode === 'none') return true;
    if (dateFilter.mode === 'single') return dateFilter.single ? ymd === dateFilter.single : true;
    // range
    const { from, to } = dateFilter;
    if (!from && !to) return true;
    if (from && ymd < from) return false;
    if (to && ymd > to) return false;
    return true;
  };

  // ====== DATA FETCH ======
  useEffect(() => {
    api
      .get('/assignments', { params: { sortBy: 'createdAt', sortOrder: 'desc' } })
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data.items || data.assignments || []);
        setItems(list);
})
      .catch(() => alert('Failed to fetch tasks.'));
  }, []);

  // ====== OPTION LISTS (enums/relations pulled from data) ======
  const enumOptions = useMemo(
    () => ({
      sourcePlatform: unique(items.map(A.sourcePlatform)),
      range: unique(items.map(A.range)),
      category: unique(items.map(A.category)),
      createdByTask: unique(items.map(A.createdByTask)),
      listingPlatform: unique(items.map(A.listingPlatform)),
      store: unique(items.map(A.store)),
      lister: unique(items.map(A.lister)),
      sharedBy: unique(items.map(A.sharedBy)),
    }),
    [items]
  );

  // ====== FILTERED LIST ======
  const filteredItems = useMemo(() => {
    return items.filter((r) =>
      matchesDate(A.date(r), filters.date) &&
      matchesText(A.productTitle(r), filters.productTitle.contains) &&
      matchesText(A.supplierLink(r), filters.supplierLink.contains) &&
      matchesNum(A.sourcePrice(r), filters.sourcePrice.min, filters.sourcePrice.max) &&
      matchesNum(A.sellingPrice(r), filters.sellingPrice.min, filters.sellingPrice.max) &&
      matchesEnum(A.sourcePlatform(r), filters.sourcePlatform.in) &&
      matchesEnum(A.range(r), filters.range.in) &&
      matchesEnum(A.category(r), filters.category.in) &&
      matchesEnum(A.createdByTask(r), filters.createdByTask.in) &&
      matchesEnum(A.listingPlatform(r), filters.listingPlatform.in) &&
      matchesEnum(A.store(r), filters.store.in) &&
      matchesNum(A.quantity(r), filters.quantity.min, filters.quantity.max) &&
      matchesEnum(A.lister(r), filters.lister.in) &&
      matchesEnum(A.sharedBy(r), filters.sharedBy.in)
    );
  }, [items, filters]);

  // ====== ACTIVE FILTER COUNT (for badge) ======
  const activeCount = useMemo(() => {
    let n = 0;
    if (filters.date.mode === 'single' && filters.date.single) n++;
    if (filters.date.mode === 'range' && (filters.date.from || filters.date.to)) n++;
    if (filters.productTitle.contains) n++;
    if (filters.supplierLink.contains) n++;
    [['sourcePrice','min'],['sourcePrice','max'],['sellingPrice','min'],['sellingPrice','max'],['quantity','min'],['quantity','max']]
      .forEach(([k, p]) => { if (filters[k][p] !== '') n++; });
    ['sourcePlatform','range','category','createdByTask','listingPlatform','store','lister','sharedBy']
      .forEach(k => { if (filters[k].in.length) n++; });
    return n;
  }, [filters]);

  // ====== HANDLERS ======
  const handleMultiChange = (key) => (event) => {
    const value = typeof event.target.value === 'string'
      ? event.target.value.split(',')
      : event.target.value;
    setFilters((f) => ({ ...f, [key]: { in: value } }));
  };

  const clearAll = () =>
    setFilters({
      date: { mode: 'none', single: '', from: '', to: '' },
      productTitle: { contains: '' },
      supplierLink: { contains: '' },
      sourcePrice: { min: '', max: '' },
      sellingPrice: { min: '', max: '' },
      sourcePlatform: { in: [] },
      range: { in: [] },
      category: { in: [] },
      createdByTask: { in: [] },
      listingPlatform: { in: [] },
      store: { in: [] },
      quantity: { min: '', max: '' },
      lister: { in: [] },
      sharedBy: { in: [] },
    });

  // ====== RENDER ======
  return (
    <Box>
      {/* FILTER TOOLBAR */}
      <Paper sx={{ p: 1.5, mb: 1.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
          <Stack direction="row" alignItems="center" gap={1}>
            <Badge color={activeCount ? 'primary' : 'default'} badgeContent={activeCount} overlap="circular">
              <IconButton
                onClick={() => setOpenFilters(v => !v)}
                size="small"
                aria-label="Toggle filters"
                sx={{
                  transform: openFilters ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform .2s',
                }}
              >
                <ExpandMoreIcon />
              </IconButton>
            </Badge>
            <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterListIcon fontSize="small" /> Filters
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Showing <b>{filteredItems.length}</b> of {items.length}
            </Typography>
          </Stack>

          <Stack direction="row" gap={1}>
            <Tooltip title="Clear all filters">
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ClearAllIcon />}
                  onClick={clearAll}
                  disabled={activeCount === 0}
                >
                  Clear all
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        <Collapse in={openFilters} timeout="auto" unmountOnExit>
          <Divider sx={{ my: 1 }} />
          {/* FILTER GRID (compact) */}
          <Grid container spacing={1.5} alignItems="center">
            {/* Date mode & pickers */}
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel id="date-mode-label">Date mode</InputLabel>
                <Select
                  labelId="date-mode-label"
                  value={filters.date.mode}
                  label="Date mode"
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, date: { ...f.date, mode: e.target.value } }))
                  }
                >
                  <MenuItem value="none">None</MenuItem>
                  <MenuItem value="single">Single day</MenuItem>
                  <MenuItem value="range">Range</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {filters.date.mode === 'single' && (
              <Grid item xs={12} md={3}>
                <TextField
                  size="small"
                  type="date"
                  label="Date"
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  value={filters.date.single}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, date: { ...f.date, single: e.target.value } }))
                  }
                />
              </Grid>
            )}

            {filters.date.mode === 'range' && (
              <>
                <Grid item xs={12} md={3}>
                  <TextField
                    size="small"
                    type="date"
                    label="From"
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    value={filters.date.from}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, date: { ...f.date, from: e.target.value } }))
                    }
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    size="small"
                    type="date"
                    label="To"
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    value={filters.date.to}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, date: { ...f.date, to: e.target.value } }))
                    }
                  />
                </Grid>
              </>
            )}

            {/* Text contains */}
            <Grid item xs={12} md={3}>
              <TextField
                size="small"
                label="Title contains"
                fullWidth
                value={filters.productTitle.contains}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, productTitle: { contains: e.target.value } }))
                }
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                size="small"
                label="Supplier link contains"
                fullWidth
                value={filters.supplierLink.contains}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, supplierLink: { contains: e.target.value } }))
                }
              />
            </Grid>

            {/* Number ranges (compact side-by-side) */}
            {[
              ['sourcePrice', 'Source Price'],
              ['sellingPrice', 'Selling Price'],
              ['quantity', 'Quantity'],
            ].map(([k, label]) => (
              <Grid item xs={12} md={3} key={k}>
                <Stack direction="row" gap={1}>
                  <TextField
                    size="small"
                    type="number"
                    label={`${label} min`}
                    fullWidth
                    value={filters[k].min}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, [k]: { ...f[k], min: e.target.value } }))
                    }
                  />
                  <TextField
                    size="small"
                    type="number"
                    label={`${label} max`}
                    fullWidth
                    value={filters[k].max}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, [k]: { ...f[k], max: e.target.value } }))
                    }
                  />
                </Stack>
              </Grid>
            ))}

            {/* Multi-select enums/relations */}
            {[
              ['sourcePlatform', 'Source Platform'],
              ['range', 'Range'],
              ['category', 'Category'],
              ['createdByTask', 'Created By'],
              ['listingPlatform', 'Listing Platform'],
              ['store', 'Store'],
              ['lister', 'Lister'],
              ['sharedBy', 'Shared By'],
            ].map(([key, label]) => (
              <Grid item xs={12} md={3} key={key}>
                <FormControl fullWidth size="small">
                  <InputLabel id={`${key}-label`}>{label}</InputLabel>
                  <Select
                    labelId={`${key}-label`}
                    multiple
                    value={filters[key].in}
                    onChange={handleMultiChange(key)}
                    input={<OutlinedInput label={label} />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                    MenuProps={MenuProps}
                  >
                    {enumOptions[key].map((name) => (
                      <MenuItem key={name} value={name}>
                        <Checkbox size="small" checked={filters[key].in.indexOf(name) > -1} />
                        <ListItemText primary={name} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            ))}
          </Grid>
        </Collapse>
      </Paper>

      {/* When collapsed, show quick summary chips (first 4) */}
      {!openFilters && activeCount > 0 && (
        <Box sx={{ mb: 1 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {(() => {
              const chips = [];

              if (filters.date.mode === 'single' && filters.date.single) {
                chips.push(`Date: ${filters.date.single}`);
              } else if (filters.date.mode === 'range' && (filters.date.from || filters.date.to)) {
                chips.push(`Date: ${filters.date.from || '…'} → ${filters.date.to || '…'}`);
              }
              if (filters.productTitle.contains) chips.push(`Title ~ ${filters.productTitle.contains}`);
              if (filters.supplierLink.contains) chips.push(`Link ~ ${filters.supplierLink.contains}`);

              [['sourcePrice','Source'], ['sellingPrice','Selling'], ['quantity','Qty']].forEach(([k, label]) => {
                const { min, max } = filters[k];
                if (min !== '' || max !== '') chips.push(`${label}: ${min || '…'}–${max || '…'}`);
              });

              [
                ['sourcePlatform','SrcPlat'],
                ['range','Range'],
                ['category','Cat'],
                ['createdByTask','CreatedBy'],
                ['listingPlatform','ListPlat'],
                ['store','Store'],
                ['lister','Lister'],
                ['sharedBy','SharedBy'],
              ].forEach(([k, label]) => {
                if (filters[k].in.length) chips.push(`${label}: ${filters[k].in.join(', ')}`);
              });

              return chips.slice(0, 4).map((txt, i) => <Chip key={i} label={txt} size="small" />);
            })()}
            {activeCount > 4 && <Chip size="small" label={`+${activeCount - 4} more`} />}
          </Stack>
        </Box>
      )}

      {/* TABLE */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>SL No</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Product Title</TableCell>
              <TableCell>Supplier Link</TableCell>
              <TableCell>Source Price</TableCell>
              <TableCell>Selling Price</TableCell>
              <TableCell>Source Platform</TableCell>
              <TableCell>Range</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Created By</TableCell>
              <TableCell>Listing Platform</TableCell>
              <TableCell>Store</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Quantity Pending</TableCell> {/* NEW */}
              <TableCell>Lister</TableCell>
              <TableCell>Shared By</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredItems.map((it, idx) => {
              const t = it.task || {};
              const q = A.quantity(it);
              const p = pendingQty(it);
              const pct = progressPct(it);
              return (
                <TableRow key={it._id || idx}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{toISTYMD(it.createdAt)}</TableCell>
                  <TableCell>{t.productTitle || '-'}</TableCell>
                  <TableCell>
                    {t.supplierLink ? (
                      <a href={t.supplierLink} target="_blank" rel="noreferrer">Link</a>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{t.sourcePrice ?? '-'}</TableCell>
                  <TableCell>{t.sellingPrice ?? '-'}</TableCell>
                  <TableCell>{t.sourcePlatform?.name || '-'}</TableCell>
                  <TableCell>{t.range || '-'}</TableCell>
                  <TableCell>{t.category || '-'}</TableCell>
                  <TableCell>{t.createdBy?.username || '-'}</TableCell>
                  <TableCell>{it.listingPlatform?.name || '-'}</TableCell>
                  <TableCell>{it.store?.name || '-'}</TableCell>
                  <TableCell>{q ?? '-'}</TableCell>
                  <TableCell>
                    {/* Pending text + tiny progress */}
                    <Stack spacing={0.5}>
                      <Typography variant="body2">{p} pending</Typography>
                      <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 3 }} />
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {Math.min(A.completedQuantity(it), q || 0)} / {q || 0} ({pct}%)
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{it.lister?.username || '-'}</TableCell>
                  <TableCell>{it.createdBy?.username || '-'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
