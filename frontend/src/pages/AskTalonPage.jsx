import React, { useMemo, useState } from 'react'
import { ArrowUp, List, Languages, RotateCcw } from 'lucide-react'
import { useRBACStore } from '../store/rbacStore'
import { askTalon } from '../utils/api'
import './AskTalonPage.css'

const starterPrompts = [
  { label: 'Summarize a topic', icon: List, prompt: 'Summarize this Talon verification topic: ' },
  { label: 'Translate text', icon: Languages, prompt: 'Translate this Talon verification text: ' }
]

export default function AskTalonPage() {
  const currentUser = useRBACStore(state => state.users.find(user => user.id === state.currentUserId))
  const userName = currentUser?.fullName || 'Authorized user'
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const firstName = useMemo(() => userName.trim().split(/\s+/)[0], [userName])

  const sendMessage = async (message = draft) => {
    const trimmedMessage = message.trim()
    if (!trimmedMessage || isLoading) return
    const nextMessages = [...messages, { role: 'user', content: trimmedMessage }]
    setMessages(nextMessages)
    setDraft('')
    setError('')
    setIsLoading(true)
    try {
      const result = await askTalon(trimmedMessage, messages, userName)
      setMessages([...nextMessages, { role: 'assistant', content: result.answer }])
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Talon could not answer right now.')
    } finally {
      setIsLoading(false)
    }
  }

  const resetChat = () => {
    setMessages([])
    setError('')
    setDraft('')
  }

  return (
    <div className="ask-talon-page">
      <main className={`ask-talon-workspace ${messages.length ? 'has-messages' : ''}`} aria-label="Ask Talon chat">
        {!messages.length ? (
          <div className="ask-talon-empty">
            <h1>How can I help you today?</h1>
          </div>
        ) : (
          <div className="ask-message-list">
            {messages.map((message, index) => (
              <article className={`ask-message ${message.role}`} key={`${message.role}-${index}`}>
                <span>{message.role === 'user' ? firstName : 'Talon'}</span>
                <p>{message.content}</p>
              </article>
            ))}
            {isLoading && <article className="ask-message assistant"><span>Talon</span><p className="ask-loading">Thinking<span>.</span><span>.</span><span>.</span></p></article>}
          </div>
        )}

        {error && <p className="ask-error" role="alert">{error}</p>}
        <form className="ask-composer" onSubmit={event => { event.preventDefault(); sendMessage() }}>
          <div className="ask-input-row">
            <textarea value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage() } }} placeholder="What's on your mind?" rows="2" aria-label="Message Talon" disabled={isLoading} />
            <button className="ask-send-button" type="submit" disabled={!draft.trim() || isLoading} aria-label="Send message" title="Send message"><ArrowUp size={18} /></button>
          </div>
        </form>
        {!messages.length && <div className="ask-suggestions">
          {starterPrompts.map(({ label, icon: Icon, prompt }) => <button key={label} type="button" onClick={() => { setDraft(prompt); }}><Icon size={16} />{label}</button>)}
        </div>}
        {messages.length > 0 && <button className="ask-reset-button" type="button" onClick={resetChat} aria-label={`Start a new chat for ${firstName}`}><RotateCcw size={14} /> New chat</button>}
      </main>
    </div>
  )
}
