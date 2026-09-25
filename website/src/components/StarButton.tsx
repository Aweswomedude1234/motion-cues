import {useEffect, useState} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';
import {Star} from 'lucide-react';
import {REPO, REPO_URL} from '../site';

/** "Star on GitHub" with the live star count (fetched once, cached for the session). */
export function StarButton({size = 'sm', label = 'Star'}: {size?: 'sm' | 'md' | 'lg'; label?: string}) {
  const [stars, setStars] = useState<number | null>(() => {
    try { const v = sessionStorage.getItem('steadycues.stars'); return v ? Number(v) : null; } catch { return null; }
  });

  useEffect(() => {
    if (stars !== null) return;
    fetch(`https://api.github.com/repos/${REPO}`)
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (j && typeof j.stargazers_count === 'number') {
          setStars(j.stargazers_count);
          try { sessionStorage.setItem('steadycues.stars', String(j.stargazers_count)); } catch { /* private mode */ }
        }
      })
      .catch(() => { /* offline or rate-limited: show the button without a count */ });
  }, [stars]);

  const text = stars !== null && stars > 0 ? `${label} · ${stars.toLocaleString()}` : label;
  return (
    <Button label={text} variant="secondary" size={size} href={REPO_URL}
      icon={<Icon icon={Star} size="sm" color="inherit" />} tooltip="Star SteadyCues on GitHub" />
  );
}
