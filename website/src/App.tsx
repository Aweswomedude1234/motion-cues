import type {ComponentType, ReactNode, SVGProps} from 'react';
import {Section} from '@astryxdesign/core/Section';
import {VStack, HStack} from '@astryxdesign/core/Stack';
import {Grid} from '@astryxdesign/core/Grid';
import {Card} from '@astryxdesign/core/Card';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';
import {Code} from '@astryxdesign/core/Code';
import {Link} from '@astryxdesign/core/Link';
import {List, ListItem} from '@astryxdesign/core/List';
import {Collapsible, CollapsibleGroup} from '@astryxdesign/core/Collapsible';
import {MediaTheme} from '@astryxdesign/core/theme';
import {
  ArrowDownToLine, ArrowUpRight, EyeOff, Feather, Gauge, Keyboard, Monitor, MousePointerClick, Move,
  ShieldCheck, SlidersHorizontal, Smartphone, Sparkles,
} from 'lucide-react';
import {CueShowcase} from './components/CueShowcase';
import {
  DOWNLOAD_URL, ISSUES_URL, LICENSE_URL, PHOTO_CREDIT, PHOTO_PAGE, RELEASES_URL, REPO_URL, VERSION, photo,
} from './site';

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

function Logo({size = 24}: {size?: number}) {
  return <img src="./icon-64.png" width={size} height={size} alt="" className="logo" />;
}

function DownloadButton({size = 'lg'}: {size?: 'sm' | 'md' | 'lg'}) {
  return (
    <Button label={size === 'sm' ? 'Download' : 'Download for Windows'} variant="primary" size={size} href={DOWNLOAD_URL}
      icon={<Icon icon={ArrowDownToLine} size="sm" color="inherit" />} />
  );
}

// List descriptions passed as nodes wrap instead of truncating to one line.
function Desc({children}: {children: ReactNode}) {
  return <Text type="supporting" color="secondary" textWrap="pretty">{children}</Text>;
}

function Band({id, label, muted, children}: {id?: string; label: string; muted?: boolean; children: ReactNode}) {
  return (
    <Section variant={muted ? 'muted' : 'transparent'} paddingBlock={0} paddingInline={0}>
      <section id={id} aria-label={label} className="page band">{children}</section>
    </Section>
  );
}

function SectionIntro({eyebrow, title, children}: {eyebrow: string; title: string; children?: ReactNode}) {
  return (
    <VStack gap={4} maxWidth={760}>
      <Text type="label" color="accent">{eyebrow}</Text>
      <Heading level={2} textWrap="balance" className="section-title">{title}</Heading>
      {children ? <Text type="large" color="secondary" textWrap="pretty">{children}</Text> : null}
    </VStack>
  );
}

function FeatureCard({icon, title, children}: {icon: IconType; title: string; children: ReactNode}) {
  return (
    <Card height="100%" padding={6}>
      <VStack gap={3}>
        <span className="feature-icon"><Icon icon={icon} size="md" color="accent" /></span>
        <Heading level={3}>{title}</Heading>
        <Text type="body" color="secondary">{children}</Text>
      </VStack>
    </Card>
  );
}

const FAQ: Array<{q: string; a: string}> = [
  {
    q: 'Will this stop me getting car sick?',
    a: 'It helps many people, but not everyone, and it isn’t a medical treatment. Motion cues are designed to reduce the mismatch between what your eyes see and what your inner ear feels, which is widely thought to cause motion sickness. Taking breaks and looking out of the window still help too.',
  },
  {
    q: 'Does my PC have a motion sensor?',
    a: 'Open SteadyCues and the Home page tells you. Most tablets and 2-in-1 laptops (Surface Pro, Lenovo Yoga, HP Spectre x360 and similar) have one. Most traditional laptops don’t, which is why SteadyCues can use your phone instead.',
  },
  {
    q: 'Why does my phone show a security warning?',
    a: 'Phones only share their motion sensors with secure (https) pages. SteadyCues creates its own security certificate on your PC. It isn’t issued by a public authority, so your phone asks you to confirm once. The connection never leaves your own network.',
  },
  {
    q: 'My phone can’t connect. What should I check?',
    a: 'Both devices need to be on the same Wi-Fi, or your PC needs to be connected to your phone’s hotspot, which is the easiest option in a car. If Windows asked whether SteadyCues can use the network, choose Allow. Otherwise open the Settings tab in SteadyCues and choose Allow in firewall.',
  },
  {
    q: 'Windows says SteadyCues is from an unknown publisher.',
    a: 'SteadyCues is new and isn’t code-signed yet, so Microsoft Defender SmartScreen doesn’t recognise it. Choose More info, then Run anyway. Every line of code is on GitHub, and you can build the exe yourself with one command.',
  },
  {
    q: 'Does it use the internet or collect any data?',
    a: 'No. There is no account, no analytics and no update pings. Your phone only ever talks to your own PC over your local network.',
  },
  {
    q: 'Can the driver use it?',
    a: 'No. SteadyCues is for passengers. Drivers should keep their eyes on the road.',
  },
  {
    q: 'How do I uninstall it?',
    a: 'Use Settings › Apps in Windows, or Uninstall on the Settings tab in SteadyCues. Either way it removes everything it added.',
  },
];

function Nav() {
  return (
    <nav className="nav" aria-label="Main navigation">
      <a className="nav-brand" href="#top">
        <Logo size={24} />
        <span>SteadyCues</span>
      </a>
      <div className="nav-links">
        <Link href="#how" color="primary" size="sm">How it works</Link>
        <Link href="#setup" color="primary" size="sm">Setup</Link>
        <Link href="#features" color="primary" size="sm">Features</Link>
        <Link href="#faq" color="primary" size="sm">FAQ</Link>
        <Link href={REPO_URL} color="primary" size="sm">GitHub</Link>
      </div>
      <DownloadButton size="sm" />
    </nav>
  );
}

function Hero() {
  return (
    <header className="hero" id="top">
      <img
        className="hero-photo"
        src={photo(1920)}
        srcSet={`${photo(1280)} 1280w, ${photo(1920)} 1920w, ${photo(2560)} 2560w`}
        sizes="100vw"
        alt=""
        fetchPriority="high"
      />
      <div className="hero-wash" aria-hidden="true" />
      <Nav />
      <MediaTheme mode="light">
        <div className="hero-copy">
          <span className="hero-eyebrow"><span className="eyebrow-dot" aria-hidden="true" />For passengers on Windows</span>
          <h1 className="hero-title">Read in the car without feeling sick.</h1>
          <p className="hero-lede">
            SteadyCues puts softly moving dots at the edges of your screen. They follow the road, so what you
            see finally agrees with what you feel.
          </p>
          <HStack gap={4} vAlign="center" hAlign="center" wrap="wrap">
            <DownloadButton />
            <Link href={REPO_URL} color="primary" weight="semibold">
              <span className="hero-link">View source <Icon icon={ArrowUpRight} size="sm" color="inherit" /></span>
            </Link>
          </HStack>
          <p className="hero-facts">
            <span>Free and open source</span><span>355 KB</span><span>No admin rights</span><span>Works with any phone</span>
          </p>
        </div>
      </MediaTheme>
      <CueShowcase />
    </header>
  );
}

export function App() {
  return (
    <>
      <Hero />
      <main>
        {/* How it works */}
        <Band id="how" label="How it works">
          <VStack gap={10}>
            <SectionIntro eyebrow="How it works" title="What you see, matched to what you feel.">
              On the road your inner ear feels every start, stop and bend, but your eyes, fixed on a still screen,
              see nothing move. SteadyCues shows that motion at the edge of your view, where you notice it without
              looking at it.
            </SectionIntro>
            <Grid columns={{minWidth: 260, repeat: 'fit'}} gap={4}>
              <FeatureCard icon={Gauge} title="It feels the car">
                SteadyCues reads a motion sensor, either your PC’s own or your phone’s, and works out which way is
                forward from how the device is held.
              </FeatureCard>
              <FeatureCard icon={Move} title="The dots move with you">
                Speeding up slides the dots down, braking lifts them, and bends push them sideways, just as they push
                you.
              </FeatureCard>
              <FeatureCard icon={MousePointerClick} title="It stays out of the way">
                Clicks go straight through the dots. In Automatic mode they fade in when the car moves and fade out
                once it stops.
              </FeatureCard>
            </Grid>
          </VStack>
        </Band>

        {/* Setup */}
        <Band id="setup" label="Setup" muted>
          <VStack gap={10}>
            <SectionIntro eyebrow="Setup" title="Ready before you reach the highway.">
              No installer wizard, no account and no admin rights.
            </SectionIntro>
            <Grid columns={{minWidth: 320, repeat: 'fit'}} gap={6} align="start">
              <Card padding={6}>
                <List listStyle="decimal">
                  <ListItem label="Download and open SteadyCues.exe"
                    description={<Desc>It installs itself for your account and adds itself to the Start menu. If Windows warns about an unknown publisher, choose More info, then Run anyway.</Desc>} />
                  <ListItem label="Got a tablet or 2-in-1? You’re done"
                    description={<Desc>SteadyCues finds your PC’s motion sensor automatically.</Desc>} />
                  <ListItem label="Otherwise, scan the code with your phone"
                    description={<Desc>Connect both to the same Wi-Fi or your phone’s hotspot, scan the QR code on your PC, confirm the one-time notice and tap Start.</Desc>} />
                  <ListItem label="Ride"
                    description={<Desc>Dots appear as soon as the car moves and fade away after it stops.</Desc>} />
                </List>
              </Card>
              <VStack gap={4}>
                <Card variant="muted" padding={6}>
                  <VStack gap={3}>
                    <Heading level={3}>What you need</Heading>
                    <Text type="body" color="secondary">A Windows 10 or 11 PC, plus one of these to sense the car:</Text>
                    <List listStyle="disc">
                      <ListItem label="A motion sensor in your PC" description={<Desc>Most tablets and 2-in-1 laptops have one.</Desc>} />
                      <ListItem label="Any phone with a web browser" description={<Desc>iPhone or Android. Nothing to install.</Desc>} />
                      <ListItem label="A GPS receiver" description={<Desc>Built in or USB. Updates once a second, so cues are gentler.</Desc>} />
                    </List>
                  </VStack>
                </Card>
                <Card variant="muted" padding={6}>
                  <HStack gap={3} vAlign="center" wrap="wrap">
                    <Icon icon={Keyboard} size="md" color="secondary" />
                    <Text type="body" color="secondary">
                      Press <Code>Ctrl + Alt + M</Code> anywhere to turn the dots on or off.
                    </Text>
                  </HStack>
                </Card>
              </VStack>
            </Grid>
          </VStack>
        </Band>

        {/* Screenshots */}
        <Band label="The app">
          <VStack gap={10}>
            <SectionIntro eyebrow="The app" title="A small app that lives in your tray.">
              One window shows whether the car is moving, connects your phone and tunes the dots. It follows Windows’
              light or dark mode.
            </SectionIntro>
            <Grid columns={{minWidth: 280, repeat: 'fit'}} gap={6}>
              <figure className="shot">
                <img src="./screenshot-home.png" alt="SteadyCues Home tab: the car is moving, dots are showing, and a phone is connected" loading="lazy" />
                <Text type="supporting" color="secondary" as="p">Home: live status and phone connection.</Text>
              </figure>
              <figure className="shot">
                <img src="./screenshot-pair.png" alt="Pairing a phone: a QR code with three short steps" loading="lazy" />
                <Text type="supporting" color="secondary" as="p">No motion sensor? Scan the code with your phone.</Text>
              </figure>
              <figure className="shot">
                <img src="./screenshot-appearance.png" alt="SteadyCues Appearance tab with a live preview and sliders for strength, size, number and opacity of the dots" loading="lazy" />
                <Text type="supporting" color="secondary" as="p">Appearance: tune the dots and preview them live.</Text>
              </figure>
            </Grid>
          </VStack>
        </Band>

        {/* Features */}
        <Band id="features" label="Features" muted>
          <VStack gap={10}>
            <SectionIntro eyebrow="Features" title="Small, quiet and private." />
            <Grid columns={{minWidth: 240, repeat: 'fit'}} gap={4}>
              <FeatureCard icon={Sparkles} title="Automatic mode">
                Dots appear only when the car is moving, then fade out a little while after it stops.
              </FeatureCard>
              <FeatureCard icon={Smartphone} title="Your phone as the sensor">
                Any iPhone or Android phone can stream its motion to your PC. Nothing to install on the phone.
              </FeatureCard>
              <FeatureCard icon={SlidersHorizontal} title="Make the dots yours">
                Adjust strength, size, number, opacity and color, and show dots on two or four edges of one or every
                display.
              </FeatureCard>
              <FeatureCard icon={ShieldCheck} title="Private by design">
                No account, no analytics, no internet needed. Motion data never leaves your network.
              </FeatureCard>
              <FeatureCard icon={Feather} title="Light on your battery">
                A 355 KB native app. It redraws only while the dots are moving and sleeps when you’re parked.
              </FeatureCard>
              <FeatureCard icon={EyeOff} title="Hidden from screen sharing">
                The dots don’t show up in screenshots, recordings or video calls unless you want them to.
              </FeatureCard>
              <FeatureCard icon={Monitor} title="Every screen, any scaling">
                Sharp at any display scaling, on one monitor or several.
              </FeatureCard>
              <FeatureCard icon={Keyboard} title="One shortcut">
                Ctrl + Alt + M hides or shows the dots from any app.
              </FeatureCard>
            </Grid>
          </VStack>
        </Band>

        {/* FAQ */}
        <Band id="faq" label="Questions">
          <Grid columns={{minWidth: 300, repeat: 'fit'}} gap={10} align="start">
            <SectionIntro eyebrow="FAQ" title="Questions, answered.">
              Something else? <Link href={ISSUES_URL}>Ask on GitHub</Link>.
            </SectionIntro>
            <CollapsibleGroup type="single" hasDividers defaultValue={FAQ[0].q}>
              {FAQ.map(item => (
                <Collapsible key={item.q} value={item.q} trigger={<Text type="body" weight="semibold">{item.q}</Text>}>
                  <Text type="body" color="secondary">{item.a}</Text>
                </Collapsible>
              ))}
            </CollapsibleGroup>
          </Grid>
        </Band>

        {/* Closing call to action, back out on the road */}
        <section className="page closing-wrap" aria-label="Download">
          <div className="closing">
            <img className="closing-photo" src={photo(1600)} alt="" loading="lazy" />
            <MediaTheme mode="dark">
              <div className="closing-copy">
                <h2 className="closing-title">Make the next trip a little easier.</h2>
                <Text type="large" color="secondary">Free forever. MIT licensed. Built in the open.</Text>
                <HStack gap={3} wrap="wrap" hAlign="center">
                  <DownloadButton />
                  <Button label="All releases" variant="secondary" size="lg" href={RELEASES_URL} />
                </HStack>
              </div>
            </MediaTheme>
          </div>
        </section>
      </main>

      <footer className="page footer">
        <HStack gap={6} wrap="wrap" hAlign="between" vAlign="start">
          <VStack gap={3} maxWidth={520}>
            <HStack gap={2} vAlign="center">
              <Logo size={22} />
              <Text type="label">SteadyCues {VERSION}</Text>
            </HStack>
            <Text type="supporting" color="secondary" textWrap="pretty">
              Free and open-source software under the MIT license. Inspired by Vehicle Motion Cues on iPhone; not
              affiliated with Apple or Microsoft. For passengers only.
            </Text>
            <Text type="supporting" color="secondary">
              Photograph by <Link href={PHOTO_CREDIT.url} size="sm">{PHOTO_CREDIT.name}</Link> on{' '}
              <Link href={PHOTO_PAGE} size="sm">Unsplash</Link>.
            </Text>
          </VStack>
          <HStack gap={5} wrap="wrap">
            <Link href={REPO_URL} size="sm" color="primary">Source code</Link>
            <Link href={RELEASES_URL} size="sm" color="primary">Releases</Link>
            <Link href={ISSUES_URL} size="sm" color="primary">Report a problem</Link>
            <Link href={LICENSE_URL} size="sm" color="primary">License</Link>
          </HStack>
        </HStack>
      </footer>
    </>
  );
}
