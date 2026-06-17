import React from 'react';
export default function RichTextEditor(props){ return <div className="panel compact"><strong>RichTextEditor</strong><pre>{JSON.stringify(props, null, 2)}</pre></div>; }
