import React from 'react';
export default function HeroEditor(props){ return <div className="panel compact"><strong>HeroEditor</strong><pre>{JSON.stringify(props, null, 2)}</pre></div>; }
