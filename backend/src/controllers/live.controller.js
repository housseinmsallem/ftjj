export async function liveStatus(req, res) {
  res.json({
    enabled: true,
    mats: [
      { mat: 'Tatami 1', status: 'READY', currentFight: null },
      { mat: 'Tatami 2', status: 'READY', currentFight: null }
    ],
    note: 'Module websocket prêt à brancher pour le scoring temps réel.'
  });
}
