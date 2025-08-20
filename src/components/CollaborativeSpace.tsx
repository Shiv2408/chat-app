'use client';

import { useCollaborativeSpace } from '@/hooks/useCollaborativeSpace'; // Import the new hook
import Cursor from './Cursor';
import Note from './Note';

export default function CollaborativeSpace() {
  // Use the hook to get all state and functions
  const { 
    user, 
    onlineUsers, 
    notes, 
    handleMouseMove, 
    handleCreateNote, 
    handleUpdateNote 
  } = useCollaborativeSpace();

  return (
    <div
      className="relative w-full h-screen overflow-hidden bg-gray-100"
      onMouseMove={handleMouseMove}
    >
      <div className="absolute bottom-4 left-4 p-4 bg-white rounded-lg shadow-md z-20">
        <h1 className="text-2xl font-bold">Collaborative Space</h1>
        <div className="mt-4">
            <h2 className="font-semibold">Users Online:</h2>
            <ul>
                {Object.values(onlineUsers).map(u => (
                    <li key={u.id} style={{ color: u.color }}>
                        {u.username} {u.id === user?.id ? '(You)' : ''}
                    </li>
                ))}
            </ul>
        </div>
        <button onClick={handleCreateNote} className="mt-4 px-4 py-2 font-semibold text-white bg-blue-500 rounded hover:bg-blue-600">
            Create Note
        </button>
      </div>

      {notes.map(note => (
          <Note key={note.id} id={note.id} content={note.content} onUpdate={handleUpdateNote} />
      ))}

      {Object.values(onlineUsers)
        .filter(u => u.id !== user?.id)
        .map(({ id, x, y, color, username }) => (
          <Cursor key={id} point={{ x: x!, y: y! }} color={color} name={username} />
        ))}
    </div>
  );
}
