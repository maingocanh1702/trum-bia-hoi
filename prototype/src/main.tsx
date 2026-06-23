import ReactDOM from 'react-dom/client'
import App from './ui/App'
import './index.css'

// Không dùng StrictMode: effect chạy 2 lần sẽ mount 2 engine/canvas (prototype không cần).
ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
