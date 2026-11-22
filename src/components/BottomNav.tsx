import { NavLink } from 'react-router';
import { IconEinstellungen, IconHeute, IconVerlauf, IconWoche } from './Icons';

/** Navigation unten: Heute · Woche · Verlauf · Einstellungen */
export function BottomNav() {
  const eintraege = [
    { ziel: '/', text: 'Heute', Icon: IconHeute },
    { ziel: '/woche', text: 'Woche', Icon: IconWoche },
    { ziel: '/verlauf', text: 'Verlauf', Icon: IconVerlauf },
    { ziel: '/einstellungen', text: 'Einstellungen', Icon: IconEinstellungen },
  ];
  return (
    <nav className="bottom-nav" aria-label="Hauptnavigation">
      <ul>
        {eintraege.map(({ ziel, text, Icon }) => (
          <li key={ziel}>
            <NavLink to={ziel} end={ziel === '/'}>
              <Icon />
              {text}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
