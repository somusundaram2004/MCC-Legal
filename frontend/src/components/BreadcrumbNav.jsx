import React from 'react';
import { Breadcrumbs, Link, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import HomeIcon from '@mui/icons-material/Home';
import FolderIcon from '@mui/icons-material/Folder';

const BreadcrumbNav = ({ path = [], onFolderClick, rootLabel = "Root" }) => {
  return (
    <Breadcrumbs 
      separator={<NavigateNextIcon fontSize="small" />} 
      aria-label="breadcrumb"
    >
      <Link
        underline="hover"
        color="inherit"
        sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 500 }}
        onClick={() => onFolderClick(null)}
      >
        <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
        {rootLabel}
      </Link>

      {path.map((folder, index) => {
        const isLast = index === path.length - 1;
        const isAccessible = folder.accessible !== false;
        
        return isLast || !isAccessible ? (
          <Typography
            key={folder.id}
            color="text.primary"
            sx={{ display: 'flex', alignItems: 'center', fontWeight: isLast ? 600 : 400 }}
          >
            <FolderIcon sx={{ mr: 0.5, color: isLast ? '#eab308' : '#94a3b8' }} fontSize="inherit" />
            {folder.name}
          </Typography>
        ) : (
          <Link
            key={folder.id}
            underline="hover"
            color="inherit"
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => onFolderClick(folder.id)}
          >
            <FolderIcon sx={{ mr: 0.5, color: '#facc15' }} fontSize="inherit" />
            {folder.name}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
};

export default BreadcrumbNav;
