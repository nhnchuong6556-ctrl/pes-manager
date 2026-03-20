export function buildTableData(players, matches, leagues, leagueId) {
  const leaguePlayers = players.filter(
    (p) => p.league === leagueId && !p.isArchived
  );

  const leagueMatches = matches.filter(
    (m) =>
      m.league === leagueId &&
      !m.isArchived &&
      typeof m.gh === "number" &&
      typeof m.ga === "number"
  );

  const isC1 = leagues.find((l) => l.id === leagueId)?.type === "C1";
  const stats = {};

  leaguePlayers.forEach((p) => {
    stats[p.id] = { ...p, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0 };
  });

  leagueMatches.forEach((m) => {
    const h = stats[m.homeId];
    const a = stats[m.awayId];
    if (!h || !a) return;

    h.P += 1;
    a.P += 1;

    h.GF += Number(m.gh) || 0;
    h.GA += Number(m.ga) || 0;
    a.GF += Number(m.ga) || 0;
    a.GA += Number(m.gh) || 0;

    if (!isC1) {
      if (m.gh > m.ga) {
        h.W += 1;
        a.L += 1;
        h.Pts += 3;
      } else if (m.gh < m.ga) {
        a.W += 1;
        h.L += 1;
        a.Pts += 3;
      } else {
        h.D += 1;
        a.D += 1;
        h.Pts += 1;
        a.Pts += 1;
      }
      return;
    }

    if (m.gh > m.ga) {
      h.W += 1;
      a.L += 1;
      h.Pts += m.winType === "90M" ? 3 : 2;
    } else if (m.gh < m.ga) {
      a.W += 1;
      h.L += 1;
      a.Pts += m.winType === "90M" ? 3 : 2;
    } else if (m.winType === "PEN") {
      if (m.ph > m.pa) {
        h.W += 1;
        a.L += 1;
        h.Pts += 1;
      } else if (m.pa > m.ph) {
        a.W += 1;
        h.L += 1;
        a.Pts += 1;
      }
    }
  });

  return Object.values(stats).sort(
    (a, b) =>
      b.Pts - a.Pts ||
      b.GF - b.GA - (a.GF - a.GA) ||
      b.GF - a.GF ||
      a.name.localeCompare(b.name)
  );
}
