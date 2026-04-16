import { createTheme } from '@mui/material/styles'

/**
 * Studio palette: dark forest green (brand / primary) + amber (secondary accents).
 * See `.design/theme.md` for tokens and usage rules.
 */
export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#166534',
      light: '#15803d',
      dark: '#14532d',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#b45309',
      light: '#d97706',
      dark: '#92400e',
      contrastText: '#fffbeb',
    },
    info: {
      main: '#166534',
      light: '#15803d',
      dark: '#14532d',
    },
    background: {
      default: '#f0fdf4',
      paper: '#ffffff',
    },
    divider: 'rgba(22, 101, 52, 0.12)',
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    button: { fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 12,
          paddingInline: 20,
          paddingBlock: 10,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiAppBar: {
      defaultProps: {
        color: 'default',
        elevation: 0,
      },
      styleOverrides: {
        root: ({ theme }) => ({
          borderBottom: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper,
        }),
      },
    },
  },
})
