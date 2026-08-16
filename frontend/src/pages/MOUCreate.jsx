import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Card, Typography, Button, TextField, MenuItem, Select, 
  FormControl, InputLabel, Grid, Stepper, Step, StepLabel, 
  Divider, Checkbox, FormControlLabel, FormGroup, Alert, Paper, Chip,
  Autocomplete
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { getTemplates, createMOU } from '../services/mouApi';
import api from '../services/api';

const STEPS = ['Basic Information', 'Template Details', 'Duration & Upload', 'Review & Share'];

const MOUCreate = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [partnerOrganization, setPartnerOrganization] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [deptCategories, setDeptCategories] = useState([]);
  const [masterStreams, setMasterStreams] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filteredFormDepts, setFilteredFormDepts] = useState([]);
  const [deptCategory, setDeptCategory] = useState('');
  const [mouTypeId, setMouTypeId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Dynamic template fields data
  const [customFieldsData, setCustomFieldsData] = useState({});

  // Duration & Dates
  const [durationMonths, setDurationMonths] = useState(12);
  const [summary, setSummary] = useState('');
  const [purpose, setPurpose] = useState('');

  // Beneficiaries & Opportunities
  const [beneficiaries, setBeneficiaries] = useState(['Students', 'Faculty']);
  const [opportunities, setOpportunities] = useState(['Internship', 'Placement']);

  // Coordinators
  const [coordinatorName, setCoordinatorName] = useState('');
  const [coordinatorEmail, setCoordinatorEmail] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');

  useEffect(() => {
    getTemplates().then(tmpls => {
      setTemplates(tmpls);
      if (tmpls.length > 0) {
        setMouTypeId(tmpls[0].id);
        setSelectedTemplate(tmpls[0]);
      }
    });

    api.get('/api/mous/master/streams/').then(res => setMasterStreams(res.data.filter(s => s.is_active))).catch(() => {});
    api.get('/api/mous/master/dept-categories/').then(res => setDeptCategories(res.data)).catch(() => {});
    api.get('/api/mous/master/departments/').then(res => setDepartments(res.data)).catch(() => {});
  }, []);

  const handleCategoryChange = (e) => {
    const strmId = e.target.value;
    setDeptCategory(strmId);
    setDepartmentName('');
    setFilteredFormDepts(departments.filter(d => String(d.stream) === String(strmId) || String(d.stream_id) === String(strmId) || String(d.category) === String(strmId)));
  };

  const handleTemplateChange = (tmplId) => {
    setMouTypeId(tmplId);
    const tmpl = templates.find(t => t.id === tmplId);
    setSelectedTemplate(tmpl);
    setCustomFieldsData({});
  };

  const handleCustomFieldChange = (fieldName, val) => {
    setCustomFieldsData(prev => ({ ...prev, [fieldName]: val }));
  };

  const handleNext = () => setActiveStep(prev => prev + 1);
  const handleBack = () => setActiveStep(prev => prev - 1);

  const handleSubmit = async () => {
    if (!title || !partnerOrganization) {
      setError('Please fill in required fields.');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      title,
      partner_organization: partnerOrganization,
      department_name: departmentName,
      mou_type: mouTypeId,
      duration_months: durationMonths,
      summary,
      purpose,
      beneficiaries,
      opportunities,
      custom_fields_data: customFieldsData,
      coordinator_name: coordinatorName,
      coordinator_email: coordinatorEmail,
      partner_name: partnerName,
      partner_email: partnerEmail,
      status: 'Shared',
    };

    try {
      const created = await createMOU(payload);
      navigate(`/mou/${created.id}`);
    } catch (err) {
      console.error('MOU creation failed:', err);
      setError('Failed to create MOU agreement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, maxWidth: 900, mx: 'auto' }} className="animate-fade-slide-up">
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/explorer')}
        sx={{ mb: 2, fontWeight: 700, color: 'text.secondary' }}
      >
        Back to Explorer
      </Button>

      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
        Create & Share New MOU
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Select a dynamic MOU template, enter agreement details, and share with the assigned department.
      </Typography>

      {/* Stepper Header */}
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel sx={{ '& .MuiStepLabel-label': { fontWeight: 700 } }}>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Step Content */}
      <Card sx={{ p: 4, borderRadius: '24px', border: '1px solid', borderColor: 'divider', mb: 3 }}>

        {/* Step 1: Basic Info */}
        {activeStep === 0 && (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
              Step 1: Agreement Info
            </Typography>

            <Grid container spacing={2.5}>
              <Grid xs={12}>
                <TextField
                  fullWidth
                  required
                  label="MOU Title / Agreement Name"
                  placeholder="e.g. ABC Technologies Student Internship MOU"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </Grid>

              <Grid xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Partner Organization / Institution"
                  placeholder="e.g. ABC Tech Corp / IIT Bombay"
                  value={partnerOrganization}
                  onChange={(e) => setPartnerOrganization(e.target.value)}
                />
              </Grid>

              <Grid xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Stream</InputLabel>
                  <Select
                    value={deptCategory}
                    label="Stream"
                    onChange={handleCategoryChange}
                  >
                    {masterStreams.map((s) => (
                      <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid xs={12} sm={6}>
                <Autocomplete
                  disabled={!deptCategory}
                  options={filteredFormDepts}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option;
                    const catObj = deptCategories.find(c => c.id === deptCategory);
                    let name = option.name;
                    if (catObj && catObj.name === 'Aided' && name.endsWith(' (Aided)')) {
                      return name.slice(0, -8);
                    }
                    if (catObj && catObj.name === 'Self-Financed (SFS)' && name.endsWith(' (SFS)')) {
                      return name.slice(0, -6);
                    }
                    return name;
                  }}
                  value={filteredFormDepts.find(d => d.name === departmentName) || null}
                  onChange={(event, newValue) => {
                    setDepartmentName(newValue ? newValue.name : '');
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      required
                      label="Target Department"
                      placeholder="Select department"
                    />
                  )}
                  fullWidth
                />
              </Grid>

              <Grid xs={12}>
                <FormControl fullWidth>
                  <InputLabel>MOU Dynamic Template</InputLabel>
                  <Select
                    value={mouTypeId}
                    label="MOU Dynamic Template"
                    onChange={(e) => handleTemplateChange(e.target.value)}
                  >
                    {templates.map(t => (
                      <MenuItem key={t.id} value={t.id}>{t.name} — {t.description}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Step 2: Template Custom Fields */}
        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
              Step 2: {selectedTemplate?.name} Template Fields
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
              {selectedTemplate?.template_notes || 'Enter template-specific information.'}
            </Typography>

            <Grid container spacing={2.5}>
              {(selectedTemplate?.fields_schema || []).map((f) => (
                <Grid xs={12} sm={6} key={f.name}>
                  <TextField
                    fullWidth
                    label={f.label}
                    type={f.type === 'number' ? 'number' : 'text'}
                    value={customFieldsData[f.name] || ''}
                    onChange={(e) => handleCustomFieldChange(f.name, e.target.value)}
                  />
                </Grid>
              ))}

              <Grid xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Short Summary of Agreement"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Step 3: Duration & Upload */}
        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
              Step 3: Duration & Contacts
            </Typography>

            <Grid container spacing={2.5}>
              <Grid xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Duration</InputLabel>
                  <Select
                    value={durationMonths}
                    label="Duration"
                    onChange={(e) => setDurationMonths(e.target.value)}
                  >
                    <MenuItem value={6}>6 Months</MenuItem>
                    <MenuItem value={12}>1 Year (12 Months)</MenuItem>
                    <MenuItem value={24}>2 Years (24 Months)</MenuItem>
                    <MenuItem value={36}>3 Years (36 Months)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="College Coordinator Name"
                  value={coordinatorName}
                  onChange={(e) => setCoordinatorName(e.target.value)}
                />
              </Grid>

              <Grid xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="College Coordinator Email"
                  value={coordinatorEmail}
                  onChange={(e) => setCoordinatorEmail(e.target.value)}
                />
              </Grid>

              <Grid xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Partner Contact Person Name"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Step 4: Review */}
        {activeStep === 3 && (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
              Step 4: Review Agreement Details
            </Typography>

            <Paper sx={{ p: 3, borderRadius: '16px', bgcolor: 'action.hover', mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main', mb: 1 }}>
                {title}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Partner: <strong>{partnerOrganization}</strong> | Department: <strong>{departmentName}</strong>
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Template: <strong>{selectedTemplate?.name}</strong> | Duration: <strong>{durationMonths} Months</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Upon submitting, the department will be notified to review and upload the executed signed copy.
              </Typography>
            </Paper>
          </Box>
        )}

        {/* Controls */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button disabled={activeStep === 0} onClick={handleBack}>
            Back
          </Button>

          {activeStep === STEPS.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading}
              startIcon={<CheckCircleIcon />}
              sx={{ borderRadius: '12px', fontWeight: 700, background: 'linear-gradient(135deg, var(--indigo) 0%, var(--violet) 100%)' }}
            >
              {loading ? 'Creating...' : 'Submit & Share MOU'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              endIcon={<ArrowForwardIcon />}
              sx={{ borderRadius: '12px', fontWeight: 700 }}
            >
              Next Step
            </Button>
          )}
        </Box>
      </Card>
    </Box>
  );
};

export default MOUCreate;
