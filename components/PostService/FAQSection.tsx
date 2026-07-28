//components/PostService/FAQSection.tsx


// ==========================================
// BLOCK 1: IMPORTS & PROPS INTERFACE
// ==========================================
import React, { useState } from 'react';
import { FAQItem } from '../../types/service.types';

export interface FAQSectionProps {
  faqs: FAQItem[];
  onAddFAQ: (faq: FAQItem) => void;
  onRemoveFAQ: (id: string) => void;
}


// ==========================================
// BLOCK 2: COMPONENT & FAQ RENDER LOGIC
// ==========================================
export const FAQSection: React.FC<FAQSectionProps> = ({ faqs, onAddFAQ, onRemoveFAQ }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;

    onAddFAQ({
      id: `faq-${Date.now()}`,
      question: question.trim(),
      answer: answer.trim()
    });

    setQuestion('');
    setAnswer('');
  };

  return (
    <div className="faq-builder-section" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {faqs.map(item => (
        <div
          key={item.id}
          style={{
            padding: '12px',
            backgroundColor: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            position: 'relative'
          }}
        >
          <strong style={{ display: 'block', marginBottom: '4px', paddingRight: '40px' }}>
            Q: {item.question}
          </strong>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#555' }}>{item.answer}</p>
          <button
            type="button"
            className="btn-danger"
            onClick={() => onRemoveFAQ(item.id)}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              padding: '2px 8px',
              fontSize: '0.75rem'
            }}
          >
            Remove
          </button>
        </div>
      ))}

      <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
        <input
          type="text"
          value={question}
          placeholder="Add a Question..."
          onChange={e => setQuestion(e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <textarea
          rows={2}
          value={answer}
          placeholder="Provide the Answer..."
          onChange={e => setAnswer(e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button type="submit" className="btn btn-secondary" style={{ alignSelf: 'flex-start', padding: '6px 14px' }}>
          + Add FAQ
        </button>
      </form>
    </div>
  );
};