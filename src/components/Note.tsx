'use client';

import React, { useState, useEffect } from 'react';

interface NoteProps {
  id: number;
  content: string | null;
  onUpdate: (id: number, content: string) => void;
}

const Note: React.FC<NoteProps> = ({ id, content, onUpdate }) => {
  const [noteContent, setNoteContent] = useState(content || '');

  useEffect(() => {
    setNoteContent(content || '');
  }, [content]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (noteContent !== content) {
        onUpdate(id, noteContent);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [noteContent, id, content, onUpdate]);

  return (
    <div className="absolute p-4 bg-yellow-200 rounded-lg shadow-lg" style={{ top: '100px', left: `${(id % 5) * 220 + 20}px` }}>
      <textarea
        value={noteContent}
        onChange={(e) => setNoteContent(e.target.value)}
        className="w-48 h-40 p-2 bg-transparent border-none resize-none focus:outline-none"
        placeholder="Start typing..."
      />
    </div>
  );
};

export default Note;
