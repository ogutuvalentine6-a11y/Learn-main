import Link from "next/link";
import { useState } from "react";

const navigation = [
  {
    title: "Learn",
    links: [
      { label: "Explore Courses", href: "/courses", description: "Browse available courses" },
      { label: "Instructors", href: "/instructors", description: "Meet the teaching team" },
      { label: "Live Learning", href: "/live", description: "Live classes and sessions" },
      { label: "Study Groups", href: "/study-groups", description: "Learn with other students" },
    ],
  },
  {
    title: "Academic",
    links: [
      { label: "Admissions", href: "/admissions", description: "Start your enrolment journey" },
      { label: "Academic Calendar", href: "/academic-calendar", description: "Important academic dates" },
      { label: "Events", href: "/events", description: "Upcoming learning events" },
      { label: "Assignments", href: "/assignments", description: "Learning tasks and submissions" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Discussions", href: "/discussions", description: "Share ideas and ask questions" },
      { label: "Resources", href: "/resources", description: "Learning materials and resources" },
      { label: "Careers", href: "/careers", description: "Explore career opportunities" },
      { label: "About Us", href: "/about", description: "Discover our platform" },
    ],
  },
];

const highlights = [
  {
    number: "01",
    title: "Structured learning",
    description: "Follow organised courses, lessons and learning materials designed to make your academic journey clearer.",
    image: "/images/education/classroom-learning.jpg",
    alt: "Students participating in a classroom learning session",
  },
  {
    number: "02",
    title: "Learn collaboratively",
    description: "Connect with other learners, participate in discussions and build knowledge through shared experiences.",
    image: "/images/education/collaborative-learning.jpg",
    alt: "Students collaborating on learning activities",
  },
  {
    number: "03",
    title: "Guidance from instructors",
    description: "Access academic guidance, instructor support, assignments and feedback throughout your studies.",
    image: "/images/education/teacher-guiding-students.jpg",
    alt: "An instructor guiding students",
  },
];

const capabilities = [
  {
    icon: "▤",
    title: "Courses and programmes",
    description: "Explore organised learning content, course materials and academic programmes.",
    href: "/courses",
  },
  {
    icon: "✓",
    title: "Assignments and assessments",
    description: "Access assignments, quizzes and assessment activities in one learning environment.",
    href: "/assignments",
  },
  {
    icon: "◷",
    title: "Academic schedules",
    description: "Keep track of academic dates, events, timetables and learning sessions.",
    href: "/academic-calendar",
  },
  {
    icon: "◎",
    title: "Learning community",
    description: "Participate in discussions, study groups and collaborative learning activities.",
    href: "/discussions",
  },
  {
    icon: "▣",
    title: "Learning resources",
    description: "Find useful study materials and resources to support your learning.",
    href: "/resources",
  },
  {
    icon: "▥",
    title: "Progress and achievement",
    description: "Use your student workspace to access learning progress and achievements.",
    href: "/login",
  },
];

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Announcement */}
      <div className="bg-slate-950 px-4 py-2.5 text-center text-sm text-white">
        <span className="font-semibold text-blue-300">Learn Education</span>
        <span className="mx-2 text-slate-500">|</span>
        A connected environment for teaching, learning and academic growth.
        <Link href="/courses" className="ml-2 font-semibold text-blue-300 hover:text-white">
          Explore courses →
        </Link>
      </div>

      {/* Main navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Learn home">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-700 text-xl font-black text-white">
              L
            </span>
            <span>
              <span className="block text-xl font-extrabold tracking-tight text-slate-950">
                Learn<span className="text-blue-700">.</span>
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Education platform
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            <Link href="/" className="rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
              Home
            </Link>

            {navigation.map((group) => (
              <div key={group.title} className="group relative">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-blue-700"
                  aria-haspopup="true"
                >
                  {group.title}
                  <span className="text-xs">⌄</span>
                </button>

                <div className="invisible absolute left-0 top-full z-50 w-80 translate-y-2 rounded-2xl border border-slate-200 bg-white p-3 opacity-0 shadow-xl transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                  {group.links.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block rounded-xl px-4 py-3 hover:bg-blue-50"
                    >
                      <span className="block text-sm font-bold text-slate-800">{item.label}</span>
                      <span className="mt-1 block text-xs text-slate-500">{item.description}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            <Link href="/contact" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-blue-700">
              Contact
            </Link>
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link href="/login" className="rounded-lg px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100">
              Sign in
            </Link>
            <Link href="/register" className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800">
              Create account <span aria-hidden="true">→</span>
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-2xl text-slate-800 hover:bg-slate-100 lg:hidden"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? "×" : "☰"}
          </button>
        </div>

        {/* Mobile navigation */}
        {mobileMenuOpen && (
          <nav className="max-h-[75vh] overflow-y-auto border-t border-slate-200 bg-white px-4 py-5 lg:hidden" aria-label="Mobile navigation">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-3 font-bold text-blue-700 hover:bg-blue-50"
            >
              Home
            </Link>

            {navigation.map((group) => (
              <details key={group.title} className="border-b border-slate-100 py-2">
                <summary className="cursor-pointer list-none rounded-lg px-3 py-3 font-bold text-slate-800 hover:bg-slate-50">
                  {group.title}
                  <span className="float-right text-slate-400">＋</span>
                </summary>
                <div className="pb-2 pl-3">
                  {group.links.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block rounded-lg px-3 py-3 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </details>
            ))}

            <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-3 font-semibold text-slate-700 hover:bg-slate-50">
              Contact
            </Link>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="rounded-lg border border-slate-300 px-4 py-3 text-center text-sm font-bold text-slate-800">
                Sign in
              </Link>
              <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="rounded-lg bg-blue-700 px-4 py-3 text-center text-sm font-bold text-white">
                Register
              </Link>
            </div>
          </nav>
        )}
      </header>

      <main>
        {/* Hero */}
        <section className="relative isolate overflow-hidden bg-slate-950">
          <div className="absolute inset-0 -z-10">
            <img
              src="/images/education/classroom-learning.jpg"
              alt=""
              className="h-full w-full object-cover opacity-35"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/35" />
          </div>

          <div className="mx-auto grid min-h-[590px] max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-28">
            <div className="max-w-2xl">
              <span className="inline-flex items-center rounded-full border border-blue-300/30 bg-blue-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-200">
                A connected learning experience
              </span>

              <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                Learn with purpose.
                <span className="mt-2 block text-blue-300">Grow with confidence.</span>
              </h1>

              <p className="mt-7 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
                Discover courses, connect with instructors, participate in assessments
                and access the academic tools you need — all through one organised
                learning platform.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/courses" className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-7 py-4 font-bold text-white shadow-lg transition hover:bg-blue-500">
                  Explore courses <span className="ml-3">→</span>
                </Link>
                <Link href="/register" className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 px-7 py-4 font-bold text-white transition hover:bg-white/20">
                  Create your account
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-slate-300">
                <span>✓ Organised courses</span>
                <span>✓ Academic support</span>
                <span>✓ Flexible access</span>
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="absolute -inset-5 rounded-[2rem] border border-blue-300/20" />
              <img
                src="/images/education/classroom-lecture.jpg"
                alt="A classroom lecture in progress"
                className="relative h-[420px] w-full rounded-[1.5rem] object-cover shadow-2xl"
              />
              <div className="absolute -bottom-7 -left-8 max-w-xs rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-700">Your learning space</p>
                <p className="mt-2 text-lg font-extrabold text-slate-900">One platform. Many possibilities.</p>
                <p className="mt-1 text-sm text-slate-500">Learn, participate and make progress.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Platform introduction */}
        <section className="border-b border-slate-200 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-blue-700">Designed for learning</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Everything you need for a more connected academic journey
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-slate-600">
              Learn brings academic content, learning activities, communication and
              student services into a single digital environment for students,
              instructors and administrators.
            </p>
          </div>
        </section>

        {/* Learning highlights */}
        <section className="bg-slate-50 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-blue-700">The learning experience</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                  Learning that moves you forward
                </h2>
              </div>
              <Link href="/courses" className="font-bold text-blue-700 hover:text-blue-900">
                Discover learning opportunities →
              </Link>
            </div>

            <div className="mt-10 grid gap-7 md:grid-cols-3">
              {highlights.map((item) => (
                <article key={item.number} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="relative h-56 overflow-hidden">
                    <img src={item.image} alt={item.alt} className="h-full w-full object-cover transition duration-500 hover:scale-105" />
                    <span className="absolute left-4 top-4 rounded-lg bg-white px-3 py-2 text-xs font-black text-blue-700 shadow">
                      {item.number}
                    </span>
                  </div>
                  <div className="p-7">
                    <h3 className="text-xl font-extrabold text-slate-950">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Platform capabilities */}
        <section className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-blue-700">Platform capabilities</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Your academic tools, connected
              </h2>
              <p className="mt-4 leading-8 text-slate-600">
                Access the key areas of the platform from one clear starting point.
              </p>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {capabilities.map((item) => (
                <Link key={item.title} href={item.href} className="group rounded-2xl border border-slate-200 bg-white p-7 transition hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-lg">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-2xl font-bold text-blue-700 transition group-hover:bg-blue-700 group-hover:text-white">
                    {item.icon}
                  </span>
                  <h3 className="mt-5 text-lg font-extrabold text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
                  <span className="mt-5 inline-flex font-bold text-blue-700">
                    Explore <span className="ml-2 transition group-hover:translate-x-1">→</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Instructor section */}
        <section className="overflow-hidden bg-slate-950 py-20">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div className="overflow-hidden rounded-2xl">
              <img
                src="/images/education/teacher-guiding-students.jpg"
                alt="An instructor supporting students during learning"
                className="h-[380px] w-full object-cover"
              />
            </div>
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-blue-300">Teaching and support</p>
              <h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-4xl">
                Better learning happens with the right guidance.
              </h2>
              <p className="mt-5 leading-8 text-slate-300">
                Learning is more than reading materials. It involves asking questions,
                receiving feedback, practising new skills and connecting with people
                who can support your academic development.
              </p>
              <div className="mt-8 space-y-4 text-sm font-medium text-slate-200">
                <p>✓ Instructor-led learning and academic guidance</p>
                <p>✓ Assignments, quizzes and learning activities</p>
                <p>✓ Discussions and collaborative study spaces</p>
                <p>✓ Access to academic information and resources</p>
              </div>
              <Link href="/instructors" className="mt-9 inline-flex rounded-xl bg-blue-600 px-6 py-3.5 font-bold text-white transition hover:bg-blue-500">
                Meet the instructors →
              </Link>
            </div>
          </div>
        </section>

        {/* Community */}
        <section className="bg-blue-50 py-20">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-blue-700">Learning community</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Learning is stronger when we learn together.
              </h2>
              <p className="mt-5 leading-8 text-slate-600">
                Join academic conversations, explore study groups, participate in
                learning events and exchange ideas with the wider learning community.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/discussions" className="rounded-xl bg-blue-700 px-6 py-3.5 font-bold text-white hover:bg-blue-800">
                  Join discussions
                </Link>
                <Link href="/study-groups" className="rounded-xl border border-blue-200 bg-white px-6 py-3.5 font-bold text-blue-800 hover:bg-blue-100">
                  Explore study groups
                </Link>
              </div>
            </div>
            <img
              src="/images/education/library-study-support.jpg"
              alt="Students studying in a library"
              className="h-[340px] w-full rounded-2xl object-cover shadow-lg"
            />
          </div>
        </section>

        {/* Final call to action */}
        <section className="bg-white px-4 py-20 text-center">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-blue-700">Get started</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Take the next step in your learning journey.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl leading-8 text-slate-600">
              Explore the platform, discover learning opportunities and create an
              account to access your learning workspace.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/register" className="rounded-xl bg-blue-700 px-8 py-4 font-bold text-white shadow hover:bg-blue-800">
                Create an account →
              </Link>
              <Link href="/login" className="rounded-xl border border-slate-300 px-8 py-4 font-bold text-slate-800 hover:bg-slate-50">
                Sign in to Learn
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer navigation */}
      <footer className="bg-slate-950 text-slate-300">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Link href="/" className="text-2xl font-black text-white">
                Learn<span className="text-blue-400">.</span>
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-7 text-slate-400">
                A connected digital environment for teaching, learning and academic growth.
              </p>
            </div>

            <div>
              <h3 className="font-extrabold text-white">Learning</h3>
              <ul className="mt-4 space-y-3 text-sm">
                <li><Link href="/courses" className="hover:text-blue-300">Courses</Link></li>
                <li><Link href="/instructors" className="hover:text-blue-300">Instructors</Link></li>
                <li><Link href="/assignments" className="hover:text-blue-300">Assignments</Link></li>
                <li><Link href="/quizzes" className="hover:text-blue-300">Quizzes</Link></li>
                <li><Link href="/resources" className="hover:text-blue-300">Resources</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-extrabold text-white">Community</h3>
              <ul className="mt-4 space-y-3 text-sm">
                <li><Link href="/discussions" className="hover:text-blue-300">Discussions</Link></li>
                <li><Link href="/study-groups" className="hover:text-blue-300">Study groups</Link></li>
                <li><Link href="/events" className="hover:text-blue-300">Events</Link></li>
                <li><Link href="/live" className="hover:text-blue-300">Live learning</Link></li>
                <li><Link href="/careers" className="hover:text-blue-300">Careers</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-extrabold text-white">Information</h3>
              <ul className="mt-4 space-y-3 text-sm">
                <li><Link href="/about" className="hover:text-blue-300">About Learn</Link></li>
                <li><Link href="/admissions" className="hover:text-blue-300">Admissions</Link></li>
                <li><Link href="/academic-calendar" className="hover:text-blue-300">Academic calendar</Link></li>
                <li><Link href="/contact" className="hover:text-blue-300">Contact</Link></li>
                <li><Link href="/login" className="hover:text-blue-300">Student sign in</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-4 border-t border-slate-800 pt-7 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Learn Education Platform. All rights reserved.</p>
            <div className="flex gap-5">
              <Link href="/about" className="hover:text-white">About</Link>
              <Link href="/contact" className="hover:text-white">Contact</Link>
              <Link href="/login" className="hover:text-white">Account</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
