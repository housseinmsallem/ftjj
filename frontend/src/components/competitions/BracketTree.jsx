import React, { useState } from "react";
import { Trophy, User, Clock, Play } from "lucide-react";
import api from "../../services/api";

export default function BracketTree({ bracket, onMatchClick, onStartMatch, fights = [], onBracketUpdate }) {
  const [draggedSeed, setDraggedSeed] = useState(null);
  const [isSwapping, setIsSwapping] = useState(false);

  if (!bracket || !bracket.rounds || bracket.rounds.length === 0) {
    return (
      <div className="bracket-empty" style={{ 
        textAlign: 'center', 
        padding: '3rem',
        color: 'var(--text-muted)',
        background: 'var(--panel-bg)',
        borderRadius: '12px',
        border: '2px dashed var(--border)'
      }}>
        <Trophy size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
        <p>Aucun arbre généré pour cette catégorie</p>
      </div>
    );
  }

  const handleDragStart = (seedPosition) => {
    setDraggedSeed(seedPosition);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (targetSeedPosition) => {
    if (!draggedSeed || draggedSeed === targetSeedPosition || isSwapping) return;
    
    setIsSwapping(true);
    try {
      await api.patch(`/competitions/brackets/${bracket._id}/seeds/swap`, {
        seedPosition1: draggedSeed,
        seedPosition2: targetSeedPosition
      });
      onBracketUpdate?.();
    } catch (error) {
      console.error('Failed to swap seeds:', error);
    } finally {
      setDraggedSeed(null);
      setIsSwapping(false);
    }
  };

  const getMatchStatus = (match) => {
    if (match.winnerSeed !== null && match.winnerSeed !== undefined) return 'finished';
    if (match.fight) {
      const fight = fights.find(f => String(f._id) === String(match.fight));
      if (fight?.status === 'LIVE') return 'live';
      if (fight?.status === 'FINISHED') return 'finished';
    }
    return 'scheduled';
  };

  const getAthleteName = (athlete, seed) => {
    if (athlete) {
      return `${athlete.firstName || ''} ${athlete.lastName || ''}`.trim() || 'Athlète';
    }
    return seed ? `Seed #${seed}` : 'En attente';
  };

  return (
    <div className="bracket-tree" style={{ 
      display: 'flex', 
      gap: '2rem',
      overflowX: 'auto',
      padding: '1.5rem',
      background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
      borderRadius: '16px',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      {bracket.rounds.map((round, roundIndex) => (
        <div 
          key={round._id || roundIndex}
          className="bracket-round"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-around',
            gap: '1.5rem',
            minWidth: '280px',
          }}
        >
          <div className="round-header" style={{
            textAlign: 'center',
            padding: '0.75rem',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
            borderRadius: '8px',
            marginBottom: '0.5rem',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            backdropFilter: 'blur(5px)'
          }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: '0.9rem',
              fontWeight: '600',
              color: 'var(--text-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {roundIndex === bracket.rounds.length - 1 ? '🏆 Finale' : `Round ${round.round}`}
            </h3>
          </div>

          {round.matches?.map((match, matchIndex) => {
            const status = getMatchStatus(match);
            const redName = getAthleteName(match.redAthlete, match.redSeed);
            const blueName = getAthleteName(match.blueAthlete, match.blueSeed);
            const redWinner = match.winnerSeed === match.redSeed;
            const blueWinner = match.winnerSeed === match.blueSeed;

            return (
              <div
                key={match._id || match.matchNumber}
                className="bracket-match"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  padding: '0.75rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 12px rgba(0, 0, 0, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
                onClick={() => onMatchClick && onMatchClick(match)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(match.redSeed, roundIndex, matchIndex)}
              >
                {status === 'live' && (
                  <div className="live-indicator" style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'rgba(239, 68, 68, 0.9)',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    animation: 'pulse 2s infinite'
                  }}>
                    <span style={{ width: '6px', height: '6px', background: 'white', borderRadius: '50%' }}></span>
                    LIVE
                  </div>
                )}

                <div className="match-number" style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-muted)',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <User size={12} />
                  Match #{match.matchNumber}
                </div>

                <div 
                  className="athlete-row red"
                  draggable={match.redSeed !== null && match.redSeed !== undefined}
                  onDragStart={() => match.redSeed !== null && handleDragStart(match.redSeed)}
                  onDragOver={handleDragOver}
                  onDrop={() => match.redSeed !== null && handleDrop(match.redSeed)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    marginBottom: '0.5rem',
                    background: redWinner 
                      ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.2) 100%)'
                      : 'rgba(239, 68, 68, 0.1)',
                    border: redWinner 
                      ? '1px solid rgba(34, 197, 94, 0.4)'
                      : '1px solid rgba(239, 68, 68, 0.2)',
                    fontWeight: redWinner ? '600' : '400',
                    color: redWinner ? '#22c55e' : 'var(--text-primary)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: match.redSeed !== null && match.redSeed !== undefined ? 'grab' : 'default',
                    opacity: isSwapping ? 0.5 : 1
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>🔴</span>
                  <span style={{ flex: 1 }}>{redName}</span>
                  {redWinner && <Trophy size={14} style={{ color: '#22c55e' }} />}
                </div>

                <div style={{ 
                  margin: '0.5rem 0', 
                  borderTop: '1px dashed rgba(255,255,255,0.2)',
                  height: '1px'
                }} />

                <div 
                  className="athlete-row blue"
                  draggable={match.blueSeed !== null && match.blueSeed !== undefined}
                  onDragStart={() => match.blueSeed !== null && handleDragStart(match.blueSeed)}
                  onDragOver={handleDragOver}
                  onDrop={() => match.blueSeed !== null && handleDrop(match.blueSeed)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    background: blueWinner 
                      ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.2) 100%)'
                      : 'rgba(59, 130, 246, 0.1)',
                    border: blueWinner 
                      ? '1px solid rgba(34, 197, 94, 0.4)'
                      : '1px solid rgba(59, 130, 246, 0.2)',
                    fontWeight: blueWinner ? '600' : '400',
                    color: blueWinner ? '#22c55e' : 'var(--text-primary)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: match.blueSeed !== null && match.blueSeed !== undefined ? 'grab' : 'default',
                    opacity: isSwapping ? 0.5 : 1
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>🔵</span>
                  <span style={{ flex: 1 }}>{blueName}</span>
                  {blueWinner && <Trophy size={14} style={{ color: '#22c55e' }} />}
                </div>

                {status === 'scheduled' && onStartMatch && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartMatch(match);
                    }}
                    style={{
                      marginTop: '0.75rem',
                      width: '100%',
                      padding: '0.5rem',
                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)',
                      border: '1px solid rgba(99, 102, 241, 0.4)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.5) 0%, rgba(139, 92, 246, 0.5) 100%)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)';
                    }}
                  >
                    <Play size={12} />
                    Démarrer le match
                  </button>
                )}

                {status === 'finished' && match.fight && (
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem',
                    background: 'rgba(34, 197, 94, 0.1)',
                    borderRadius: '6px',
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    color: '#22c55e',
                    fontWeight: '600'
                  }}>
                    ✓ Terminé
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
