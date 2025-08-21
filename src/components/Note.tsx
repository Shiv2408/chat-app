'use client';

import React, { useState, useEffect, useRef } from 'react';

interface NoteProps {
  id: number;
  content: string | null;
  onChange: (id: number, content:string) => void;
  onUpdate: (id: number, content: string) => void;
}

const Note: React.FC<NoteProps> = ({ id, content, onChange, onUpdate }) => {
  const [noteContent, setNoteContent] = useState(content || '');
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!isTypingRef.current) {
      setNoteContent(content || '');
    }
  }, [content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setNoteContent(newContent);
    onChange(id, newContent);
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      if (noteContent !== content) {
        onUpdate(id, noteContent);
      }
      isTypingRef.current = false;
    }, 1000);

    return () => {
      clearTimeout(handler);
    };
  }, [noteContent, id, content, onUpdate]);


  return (
    <div className="absolute p-4 bg-yellow-200 rounded-lg shadow-lg" style={{ top: '100px', left: `${(id % 5) * 220 + 20}px` }}>
      <textarea
        value={noteContent}
        onChange={handleChange}
        onFocus={() => isTypingRef.current = true}
        onBlur={() => {
          isTypingRef.current = false;
          if (noteContent !== content) {
            onUpdate(id, noteContent);
          }
        }}
        className="w-48 h-40 p-2 bg-transparent border-none resize-none focus:outline-none"
        placeholder="Start typing..."
      />
    </div>
  );
};

export default Note;