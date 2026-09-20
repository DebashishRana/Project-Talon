import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import FrontendErrorBoundary from './components/FrontendErrorBoundary'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <FrontendErrorBoundary><App /></FrontendErrorBoundary>
  </React.StrictMode>,
)

