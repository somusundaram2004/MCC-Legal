import React from 'react';
import { Box, Paper } from '@mui/material';
import ImportExportTab from '../components/ImportExportTab';
import { useThemeMode } from '../context/ThemeContext';

const ImportExportPage = () => {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';

  return (
    <Box sx={{ flexGrow: 1, maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 3 } }} className="animate-fade-slide-up">
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3.5 },
          borderRadius: '24px',
          border: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
          bgcolor: isDark ? '#1E293B' : '#FFFFFF',
          boxShadow: isDark ? 'none' : '0 4px 20px rgba(0,0,0,0.02)'
        }}
      >
        <ImportExportTab />
      </Paper>
    </Box>
  );
};

export default ImportExportPage;
