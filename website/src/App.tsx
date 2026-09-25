import type {ComponentType, ReactNode, SVGProps} from 'react';
import {AppShell} from '@astryxdesign/core/AppShell';
import {TopNav, TopNavHeading, TopNavItem} from '@astryxdesign/core/TopNav';
import {NavIcon} from '@astryxdesign/core/NavIcon';
import {Section} from '@astryxdesign/core/Section';
import {Stack, VStack, HStack} from '@astryxdesign/core/Stack';
import {Grid} from '@astryxdesign/core/Grid';
import {Card} from '@astryxdesign/core/Card';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Badge} from '@astryxdesign/core/Badge';
import {Icon} from '@astryxdesign/core/Icon';
import {Code} from '@astryxdesign/core/Code';
import {Link} from '@astryxdesign/core/Link';
import {List, ListItem} from '@astryxdesign/core/List';
import {Collapsible, CollapsibleGroup} from '@astryxdesign/core/Collapsible';
import {Divider} from '@astryxdesign/core/Divider';
import {
  Download, EyeOff, Feather, Gauge, Keyboard, Monitor, MousePointerClick, Move, ShieldCheck,
  SlidersHorizontal, Smartphone, Sparkles,
} from 'lucide-react';
import {MotionDemo} from './components/MotionDemo';
import {DOWNLOAD_URL, ISSUES_URL, LICENSE_URL, RELEASES_URL, REPO_URL, VERSION} from './site';

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

function GitHubMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function Logo({size = 24}: {size?: number}) {
  return <img src="./icon-64.png" width={size} height={size} alt="" className="logo" />;
}

function Page({id, children, label}: {id?: string; children: ReactNode; label?: string}) {
  return (
    <Section variant="transparent" paddingBlock={10} paddingInline={0}>
      <section id={id} aria-label={label} className="page">
        {children}
      </section>
    </Section>
  );
}

function SectionIntro({eyebrow, title, children}: {eyebrow: string; title: string; children?: ReactNode}) {
  return (
    <VStack gap={3} maxWidth={720}>
      <Text type="label" color="accent">{eyebrow}</Text>
      <Heading level={2} type="display-3" textWrap="balance">{title}</Heading>
      {children ? <Text type="large" color="secondary" textWrap="pretty">{children}</Text> : null}
    </VStack>
  );
}

// List descriptions passed as nodes wrap instead of truncating to one line.
function Desc({children}: {children: ReactNode}) {
  return <Text type="supporting" color="secondary" textWrap="pretty">{children}</Text>;
}

function FeatureCard({icon, title, children}: {icon: IconType; title: string; children: ReactNode}) {
  return (
    <Card height="100%">
      <VStack gap={3}>
        <span className="feature-icon"><Icon icon={icon} size="md" color="accent" /></span>
        <Heading level={3}>{title}</Heading>
        <Text type="body" color="secondary">{children}</Text>
      </VStack>
    </Card>
  );
}

const FAQ: Array<{q: string; a: ReactNode}> = [
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

export function App() {
  return (
    <AppShell
      height="auto"
      variant="surface"
      topNav={
        <TopNav
          label="Main navigation"
          heading={<TopNavHeading heading="SteadyCues" headingHref="#top" logo={<NavIcon icon={<Logo size={20} />} />} />}
          startContent={
            <>
              <TopNavItem label="How it works" href="#how" />
              <TopNavItem label="Setup" href="#setup" />
              <TopNavItem label="Features" href="#features" />
              <TopNavItem label="FAQ" href="#faq" />
            </>
          }
          endContent={
            <HStack gap={2}>
              <Button label="GitHub" variant="ghost" size="sm" href={REPO_URL} icon={<GitHubMark width={16} height={16} />} isIconOnly tooltip="Source code on GitHub" />
              <Button label="Download" variant="primary" size="sm" href={DOWNLOAD_URL} />
            </HStack>
          }
        />
      }>
      <main id="top">
        {/* Hero */}
        <Section variant="transparent" paddingBlock={10} paddingInline={0}>
          <div className="page">
            <VStack gap={10}>
              <VStack gap={6} hAlign="center">
                <Badge variant="cyan" label="Free and open source · Windows 10 and 11" />
                <Heading level={1} type="display-1" justify="center" textWrap="balance">
                  Read in the car without feeling sick
                </Heading>
                <VStack maxWidth={660}>
                  <Text type="large" color="secondary" justify="center" textWrap="pretty">
                    SteadyCues puts softly moving dots at the edges of your screen. They move with the car, so what
                    you see finally agrees with what you feel.
                  </Text>
                </VStack>
                <HStack gap={3} wrap="wrap" hAlign="center">
                  <Button label="Download for Windows" variant="primary" size="lg" href={DOWNLOAD_URL}
                    icon={<Icon icon={Download} size="sm" color="inherit" />} />
                  <Button label="View source on GitHub" variant="secondary" size="lg" href={REPO_URL}
                    icon={<GitHubMark width={16} height={16} />} />
                </HStack>
                <Text type="supporting" color="secondary" justify="center">
                  Version {VERSION} · 360 KB · Installs in seconds, no admin rights needed
                </Text>
              </VStack>
              <VStack maxWidth={880} width="100%">
                <div className="hero-demo">
                  <Card padding={3} elevation="low">
                    <MotionDemo />
                  </Card>
                </div>
              </VStack>
            </VStack>
          </div>
        </Section>

        <Divider />

        {/* How it works */}
        <Page id="how" label="How it works">
          <VStack gap={8}>
            <SectionIntro eyebrow="How it works" title="What you see, matched to what you feel">
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
        </Page>

        {/* Setup */}
        <Section variant="muted" paddingBlock={0} paddingInline={0}>
          <Page id="setup" label="Setup">
            <VStack gap={8}>
              <SectionIntro eyebrow="Setup" title="Ready in about a minute">
                No installer wizard, no account and no admin rights.
              </SectionIntro>
              <Grid columns={{minWidth: 320, repeat: 'fit'}} gap={8} align="start">
                <Card>
                  <List listStyle="decimal">
                    <ListItem
                      label="Download and open SteadyCues.exe"
                      description={<Desc>It installs itself for your account and adds itself to the Start menu. If Windows warns about an unknown publisher, choose More info, then Run anyway.</Desc>}
                    />
                    <ListItem
                      label="Got a tablet or 2-in-1? You’re done"
                      description={<Desc>SteadyCues finds your PC’s motion sensor automatically.</Desc>}
                    />
                    <ListItem
                      label="Otherwise, scan the code with your phone"
                      description={<Desc>Connect both to the same Wi-Fi or your phone’s hotspot, scan the QR code on your PC, confirm the one-time notice and tap Start.</Desc>}
                    />
                    <ListItem
                      label="Ride"
                      description={<Desc>Dots appear as soon as the car moves and fade away after it stops.</Desc>}
                    />
                  </List>
                </Card>
                <VStack gap={4}>
                  <Card variant="muted">
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
                  <Card variant="muted">
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
          </Page>
        </Section>

        {/* Screenshots */}
        <Page label="The app">
          <VStack gap={8}>
            <SectionIntro eyebrow="The app" title="A small app that lives in your tray">
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
        </Page>

        <Divider />

        {/* Features */}
        <Page id="features" label="Features">
          <VStack gap={8}>
            <SectionIntro eyebrow="Features" title="Small, quiet and private" />
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
                A 360 KB native app. It redraws only while the dots are moving and sleeps when you’re parked.
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
        </Page>

        {/* FAQ */}
        <Section variant="muted" paddingBlock={0} paddingInline={0}>
          <Page id="faq" label="Questions">
            <Grid columns={{minWidth: 300, repeat: 'fit'}} gap={8} align="start">
              <SectionIntro eyebrow="FAQ" title="Questions, answered">
                Something else? Ask on GitHub.
              </SectionIntro>
              <CollapsibleGroup type="single" hasDividers defaultValue={FAQ[0].q}>
                {FAQ.map(item => (
                  <Collapsible key={item.q} value={item.q} trigger={<Text type="body" weight="semibold">{item.q}</Text>}>
                    <Text type="body" color="secondary">{item.a}</Text>
                  </Collapsible>
                ))}
              </CollapsibleGroup>
            </Grid>
          </Page>
        </Section>

        {/* Closing call to action */}
        <Page label="Download">
          <Card padding={8}>
            <Stack direction="vertical" gap={5} hAlign="center">
              <Logo size={56} />
              <Heading level={2} type="display-3" justify="center" textWrap="balance">
                Make your next trip a little easier
              </Heading>
              <Text type="body" color="secondary" justify="center">
                Free forever. MIT licensed. Built in the open.
              </Text>
              <HStack gap={3} wrap="wrap" hAlign="center">
                <Button label="Download for Windows" variant="primary" size="lg" href={DOWNLOAD_URL}
                  icon={<Icon icon={Download} size="sm" color="inherit" />} />
                <Button label="All releases" variant="secondary" size="lg" href={RELEASES_URL} />
              </HStack>
            </Stack>
          </Card>
        </Page>
      </main>

      <Divider />
      <footer className="page footer">
        <VStack gap={4}>
          <HStack gap={2} vAlign="center">
            <Logo size={20} />
            <Text type="label">SteadyCues</Text>
          </HStack>
          <Text type="supporting" color="secondary" textWrap="pretty">
            Free and open-source software under the MIT license. Inspired by Vehicle Motion Cues on iPhone; not
            affiliated with Apple or Microsoft. For passengers only.
          </Text>
          <HStack gap={4} wrap="wrap">
            <Link href={REPO_URL} size="sm">Source code</Link>
            <Link href={RELEASES_URL} size="sm">Releases</Link>
            <Link href={ISSUES_URL} size="sm">Report a problem</Link>
            <Link href={LICENSE_URL} size="sm">License</Link>
          </HStack>
        </VStack>
      </footer>
    </AppShell>
  );
}
