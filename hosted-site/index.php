<?php
require_once __DIR__ . '/config.php';

/* ─── Server-side profile fetch ──────────────────────────────────────────── */
$apiData = null;
$error   = null;

if (empty($clientId) || $clientId === 'REPLACE_WITH_CLIENT_ID') {
    $error = ['title' => 'Not configured', 'detail' => 'Set $clientId in config.php for this deployment.'];
} else {
    $url = rtrim($crmBase, '/') . '/api/public/profile?id=' . urlencode($clientId);
    $ch  = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 5,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    $raw     = curl_exec($ch);
    $status  = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($curlErr || !$raw) {
        $error = ['title' => 'Something went wrong', 'detail' => "Couldn't load this profile. Please try again later."];
    } elseif ($status === 404) {
        $error = ['title' => 'Page not found', 'detail' => "This profile isn't available or isn't active."];
    } elseif ($status !== 200) {
        $error = ['title' => 'Something went wrong', 'detail' => "Couldn't load this profile. Please try again later."];
    } else {
        $apiData = json_decode($raw, true);
    }
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function h($s) {
    return htmlspecialchars((string) ($s ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function ctaAttrs($cta) {
    $href = $cta ?: '#contact';
    $ext  = $cta && preg_match('/^https?:\/\//', $cta);
    return 'href="' . h($href) . '"' . ($ext ? ' target="_blank" rel="noreferrer"' : '');
}

/* ─── Fallbacks (mirrors JS withFallbacks) ────────────────────────────────── */
$FALLBACK = [
    'doctorName'       => 'Dr. Jane Doe',
    'specialty'        => 'Cardiology',
    'credentials'      => 'MD, FACC',
    'heroTitleLine1'   => 'Compassionate care',
    'heroTitleLine2'   => 'for your heart.',
    'heroTagline'      => 'Providing state-of-the-art cardiovascular treatments with a patient-first approach. Your journey to a healthier heart starts here.',
    'heroImageUrl'     => 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=1000',
    'aboutImageUrl'    => 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=800',
    'aboutBio'         => 'With over 15 years of experience in clinical cardiology, the doctor is dedicated to preventing, diagnosing, and treating cardiovascular diseases.',
    'achievements'     => [
        'Board Certified in Cardiovascular Disease',
        'MD from Harvard Medical School',
        'Fellow of the American College of Cardiology',
    ],
    'servicesTitle'    => 'Comprehensive Cardiac Care',
    'servicesSubtitle' => 'Utilizing the latest technology and evidence-based medicine to provide optimal outcomes for our patients.',
    'services'         => [
        ['title' => 'Preventive Cardiology', 'description' => 'Comprehensive risk assessments, cholesterol management, and tailored lifestyle guidance to keep your heart healthy.'],
        ['title' => 'Diagnostic Testing',    'description' => 'State-of-the-art non-invasive testing including stress tests, Holter monitors, and advanced echocardiography.'],
        ['title' => 'Chronic Care',          'description' => 'Expert, long-term management of hypertension, arrhythmias, coronary artery disease, and heart failure.'],
    ],
    'address'          => "123 Medical Center Drive, Suite 400\nHealthcare City, HC 12345",
    'phone'            => '(555) 123-4567',
    'hours'            => 'Mon - Fri: 8:00 AM - 5:00 PM',
];

function applyFallbacks(array $p, array $fb): array {
    $v = function ($key) use ($p, $fb) {
        $val = $p[$key] ?? null;
        return ($val === null || $val === '') ? $fb[$key] : $val;
    };
    $arr = function ($key) use ($p, $fb) {
        return (isset($p[$key]) && is_array($p[$key]) && count($p[$key]) > 0) ? $p[$key] : $fb[$key];
    };
    return [
        'doctorName'       => $v('doctorName'),
        'specialty'        => $v('specialty'),
        'credentials'      => $v('credentials'),
        'heroTitleLine1'   => $v('heroTitleLine1'),
        'heroTitleLine2'   => $v('heroTitleLine2'),
        'heroTagline'      => $v('heroTagline'),
        'heroImageUrl'     => $v('heroImageUrl'),
        'aboutImageUrl'    => $v('aboutImageUrl'),
        'aboutBio'         => $v('aboutBio'),
        'achievements'     => $arr('achievements'),
        'servicesTitle'    => $v('servicesTitle'),
        'servicesSubtitle' => $v('servicesSubtitle'),
        'services'         => $arr('services'),
        'address'          => $v('address'),
        'phone'            => $v('phone'),
        'hours'            => $v('hours'),
        'faviconUrl'       => $p['faviconUrl'] ?? null,
    ];
}

/* ─── SVG icons ───────────────────────────────────────────────────────────── */
define('ICON_CHECK',   '<svg class="h-6 w-6 shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>');
define('ICON_SERVICE', '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>');
define('ICON_PIN',     '<svg class="w-6 h-6 mr-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>');
define('ICON_PHONE',   '<svg class="w-6 h-6 mr-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>');
define('ICON_CLOCK',   '<svg class="w-6 h-6 mr-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>');

/* ─── Lead form ───────────────────────────────────────────────────────────── */
function leadForm(array $cls): string {
    return
        '<form id="lead-form" class="space-y-5">' .
          '<div>' .
            '<label class="' . $cls['label'] . '" for="lf-name">Full Name</label>' .
            '<input id="lf-name" name="name" type="text" required minlength="2" placeholder="John Doe" class="' . $cls['input'] . '" />' .
          '</div>' .
          '<div>' .
            '<label class="' . $cls['label'] . '" for="lf-phone">Phone Number</label>' .
            '<input id="lf-phone" name="phone" type="tel" required minlength="10" placeholder="+91 98765 43210" class="' . $cls['input'] . '" />' .
          '</div>' .
          '<div>' .
            '<label class="' . $cls['label'] . '" for="lf-message">How can we help?</label>' .
            '<textarea id="lf-message" name="message" rows="4" placeholder="Briefly describe your concern or inquiry\xe2\x80\xa6" class="' . $cls['input'] . ' resize-none"></textarea>' .
          '</div>' .
          '<p id="lf-error" class="hidden rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"></p>' .
          '<button type="submit" class="' . $cls['button'] . '">Request Appointment</button>' .
        '</form>';
}

/* ─── Template 1: Classic (sky / slate) ──────────────────────────────────── */
function template1(array $d, ?string $cta): string {
    $year         = date('Y');
    $achievements = implode('', array_map(
        fn($a) => '<li class="flex items-start">' . ICON_CHECK . '<span class="ml-3 text-base text-gray-700">' . h($a) . '</span></li>',
        $d['achievements']
    ));
    $services = implode('', array_map(
        fn($s) =>
            '<div class="rounded-xl border border-gray-100 bg-slate-50 p-8 shadow-sm transition duration-300 hover:shadow-lg">' .
              '<div class="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-sky-700">' . ICON_SERVICE . '</div>' .
              '<h3 class="mb-3 text-xl font-bold text-slate-900">' . h($s['title']) . '</h3>' .
              '<p class="text-gray-600">' . h($s['description']) . '</p>' .
            '</div>',
        $d['services']
    ));
    $form  = leadForm([
        'label'  => 'block text-sm font-medium text-gray-700',
        'input'  => 'mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-4 py-3 text-sm shadow-sm focus:border-sky-700 focus:ring-sky-700',
        'button' => 'flex w-full justify-center rounded-md bg-sky-700 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-sky-500 disabled:opacity-60',
    ]);
    $creds = $d['credentials'] ? ', ' . h($d['credentials']) : '';
    $ta    = ctaAttrs($cta);
    return
        '<div style="font-family:Inter,system-ui,sans-serif" class="bg-slate-50 text-gray-800 antialiased">' .
        '<nav class="sticky top-0 z-50 bg-white shadow-sm"><div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div class="flex h-20 items-center justify-between">' .
          '<div class="flex items-center"><span class="text-2xl font-bold tracking-tight text-sky-700">' . h($d['doctorName']) . '</span><span class="ml-2 hidden border-l border-gray-300 pl-2 text-sm text-gray-500 sm:block">' . h($d['specialty']) . '</span></div>' .
          '<div class="hidden space-x-8 md:flex"><a href="#about" class="font-medium text-gray-600 hover:text-sky-700">About</a><a href="#services" class="font-medium text-gray-600 hover:text-sky-700">Specialties</a><a href="#contact" class="font-medium text-gray-600 hover:text-sky-700">Contact</a></div>' .
          '<a ' . $ta . ' class="rounded-md bg-sky-700 px-6 py-2.5 font-semibold text-white shadow-md transition hover:bg-sky-500">Book Appointment</a>' .
        '</div></div></nav>' .
        '<section class="relative overflow-hidden border-b border-gray-100 bg-white"><div class="mx-auto max-w-7xl"><div class="relative z-10 bg-white px-4 pt-16 pb-8 sm:px-6 sm:pb-16 lg:w-full lg:max-w-2xl lg:pt-24 lg:pb-28 lg:px-8"><main class="mx-auto mt-10 max-w-7xl lg:mt-20"><div class="sm:text-center lg:text-left">' .
          '<h1 class="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl md:text-6xl"><span class="block">' . h($d['heroTitleLine1']) . '</span><span class="block text-sky-700">' . h($d['heroTitleLine2']) . '</span></h1>' .
          '<p class="mt-3 text-base text-gray-600 sm:mt-5 sm:text-lg md:text-xl">' . h($d['heroTagline']) . '</p>' .
          '<div class="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start"><div class="rounded-md shadow"><a ' . $ta . ' class="flex w-full items-center justify-center rounded-md bg-sky-700 px-8 py-3 text-base font-medium text-white hover:bg-sky-500 md:py-4 md:text-lg">Schedule Consultation</a></div><div class="mt-3 sm:mt-0 sm:ml-3"><a href="#services" class="flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-8 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 md:py-4 md:text-lg">Our Services</a></div></div>' .
        '</div></main></div></div>' .
        '<div class="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2"><img class="h-56 w-full object-cover sm:h-72 md:h-96 lg:h-full lg:w-full" src="' . h($d['heroImageUrl']) . '" alt="' . h($d['doctorName']) . '"></div></section>' .
        '<section id="about" class="bg-slate-50 py-20"><div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div class="items-center lg:grid lg:grid-cols-2 lg:gap-16">' .
          '<div class="mb-10 overflow-hidden rounded-lg shadow-xl lg:mb-0"><img src="' . h($d['aboutImageUrl']) . '" alt="portrait" class="h-auto w-full object-cover"></div>' .
          '<div><h2 class="text-base font-semibold uppercase tracking-wide text-sky-700">About The Doctor</h2><p class="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">' . h($d['doctorName']) . $creds . '</p><p class="mt-4 pre-line text-lg text-gray-600">' . h($d['aboutBio']) . '</p><div class="mt-8 border-t border-gray-200 pt-6"><ul class="space-y-4">' . $achievements . '</ul></div></div>' .
        '</div></div></section>' .
        '<section id="services" class="bg-white py-20"><div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div class="mx-auto mb-16 max-w-3xl text-center"><h2 class="text-base font-semibold uppercase tracking-wide text-sky-700">Specialties</h2><p class="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">' . h($d['servicesTitle']) . '</p><p class="mx-auto mt-4 max-w-2xl text-xl text-gray-500">' . h($d['servicesSubtitle']) . '</p></div><div class="grid grid-cols-1 gap-8 md:grid-cols-3">' . $services . '</div></div></section>' .
        '<section id="contact" class="bg-slate-900 py-20 text-white"><div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div class="grid grid-cols-1 gap-16 md:grid-cols-2"><div><h2 class="mb-4 text-3xl font-extrabold tracking-tight">Get in Touch</h2><p class="mb-8 text-lg text-gray-400">Contact our office to schedule your consultation today.</p><div class="space-y-6">' .
          '<div class="flex items-center text-sky-500">' . ICON_PIN . '<span class="pre-line text-gray-300">' . h($d['address']) . '</span></div>' .
          '<div class="flex items-center text-sky-500">' . ICON_PHONE . '<span class="text-gray-300">' . h($d['phone']) . '</span></div>' .
          '<div class="flex items-center text-sky-500">' . ICON_CLOCK . '<span class="text-gray-300">' . h($d['hours']) . '</span></div>' .
        '</div></div><div class="rounded-lg bg-white p-8 text-gray-800 shadow-2xl">' . $form . '</div></div></div></section>' .
        '<footer class="border-t border-gray-800 bg-gray-900 py-8"><div class="mx-auto max-w-7xl px-4 text-center"><p class="text-sm text-gray-400">&copy; ' . $year . ' ' . h($d['doctorName']) . ' ' . h($d['specialty']) . '. All rights reserved.</p></div></footer>' .
        '</div>';
}

/* ─── Template 2: Premium (slate / sky-600, rounded, airy) ───────────────── */
function template2(array $d, ?string $cta): string {
    $year         = date('Y');
    $achievements = implode('', array_map(
        fn($a) => '<li class="flex items-center"><span class="h-2 w-2 shrink-0 rounded-full bg-sky-600"></span><span class="ml-4 text-sm font-medium text-slate-700">' . h($a) . '</span></li>',
        $d['achievements']
    ));
    $services = implode('', array_map(
        fn($s) =>
            '<div class="rounded-3xl border border-slate-100 bg-white p-8 transition hover:border-slate-200 hover:bg-slate-50">' .
              '<div class="mb-6 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-sky-600">' . ICON_SERVICE . '</div>' .
              '<h3 class="mb-3 text-lg font-semibold text-slate-900">' . h($s['title']) . '</h3>' .
              '<p class="text-sm leading-relaxed text-slate-500">' . h($s['description']) . '</p>' .
            '</div>',
        $d['services']
    ));
    $form  = leadForm([
        'label'  => 'mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500',
        'input'  => 'block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-sm focus:border-sky-600 focus:ring-1 focus:ring-sky-600',
        'button' => 'w-full rounded-xl bg-slate-900 px-4 py-4 text-xs font-semibold uppercase tracking-wider text-white shadow-lg transition hover:bg-slate-700 disabled:opacity-60',
    ]);
    $creds = $d['credentials'] ? ', ' . h($d['credentials']) : '';
    $ta    = ctaAttrs($cta);
    return
        '<div style="font-family:Inter,system-ui,sans-serif" class="bg-slate-50 text-slate-900 antialiased">' .
        '<nav class="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md"><div class="mx-auto max-w-7xl px-6 lg:px-8"><div class="flex h-20 items-center justify-between">' .
          '<div class="flex items-center gap-3"><span class="text-xl font-bold tracking-tight text-slate-900">' . h($d['doctorName']) . '</span><span class="hidden rounded-full border border-slate-100 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-widest text-slate-400 sm:inline-block">' . h($d['specialty']) . '</span></div>' .
          '<div class="hidden space-x-10 md:flex"><a href="#about" class="text-sm font-medium tracking-wide text-slate-500 hover:text-slate-900">About</a><a href="#services" class="text-sm font-medium tracking-wide text-slate-500 hover:text-slate-900">Specialties</a><a href="#contact" class="text-sm font-medium tracking-wide text-slate-500 hover:text-slate-900">Contact</a></div>' .
          '<a ' . $ta . ' class="rounded-full bg-slate-900 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition hover:bg-slate-700">Book Appointment</a>' .
        '</div></div></nav>' .
        '<section class="border-b border-slate-100 bg-white"><div class="mx-auto max-w-7xl px-6 lg:px-8"><div class="grid grid-cols-1 items-center gap-12 pt-16 pb-20 lg:grid-cols-2 lg:pt-28 lg:pb-32">' .
          '<div class="mx-auto max-w-xl lg:mx-0"><h1 class="text-4xl font-light leading-tight tracking-tight text-slate-900 sm:text-5xl md:text-6xl">' . h($d['heroTitleLine1']) . '<span class="mt-2 block font-semibold text-sky-600">' . h($d['heroTitleLine2']) . '</span></h1><p class="mt-6 text-base leading-relaxed text-slate-500 sm:text-lg">' . h($d['heroTagline']) . '</p><div class="mt-10 flex flex-col gap-4 sm:flex-row"><a ' . $ta . ' class="flex items-center justify-center rounded-full bg-slate-900 px-8 py-4 text-sm font-medium text-white hover:bg-slate-700">Schedule Consultation</a><a href="#services" class="flex items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-4 text-sm font-medium text-slate-600 hover:bg-slate-50">Our Services</a></div></div>' .
          '<div class="h-[450px] w-full overflow-hidden rounded-3xl border border-slate-100 shadow-2xl lg:h-[600px]"><img class="h-full w-full object-cover" src="' . h($d['heroImageUrl']) . '" alt="' . h($d['doctorName']) . '"></div>' .
        '</div></div></section>' .
        '<section id="about" class="bg-slate-50 py-24"><div class="mx-auto max-w-7xl px-6 lg:px-8"><div class="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">' .
          '<div class="overflow-hidden rounded-3xl border border-white bg-white p-3 shadow-xl"><img src="' . h($d['aboutImageUrl']) . '" alt="portrait" class="h-[500px] w-full rounded-2xl object-cover"></div>' .
          '<div><h2 class="mb-4 inline-block rounded-full bg-sky-600/5 px-3 py-1 text-xs font-bold uppercase tracking-widest text-sky-600">About The Doctor</h2><p class="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">' . h($d['doctorName']) . $creds . '</p><p class="mt-6 pre-line text-base leading-relaxed text-slate-600">' . h($d['aboutBio']) . '</p><div class="mt-10 border-t border-slate-200/60 pt-8"><ul class="space-y-4">' . $achievements . '</ul></div></div>' .
        '</div></div></section>' .
        '<section id="services" class="bg-white py-24"><div class="mx-auto max-w-7xl px-6 lg:px-8"><div class="mx-auto mb-20 max-w-2xl text-center"><h2 class="mb-4 inline-block rounded-full bg-sky-600/5 px-3 py-1 text-xs font-bold uppercase tracking-widest text-sky-600">Specialties</h2><p class="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">' . h($d['servicesTitle']) . '</p><p class="mt-4 text-base text-slate-500">' . h($d['servicesSubtitle']) . '</p></div><div class="grid grid-cols-1 gap-8 md:grid-cols-3">' . $services . '</div></div></section>' .
        '<section id="contact" class="bg-slate-950 py-24 text-white"><div class="mx-auto max-w-7xl px-6 lg:px-8"><div class="grid grid-cols-1 items-center gap-16 lg:grid-cols-2"><div><h2 class="mb-4 text-3xl font-light tracking-tight sm:text-4xl">Get in Touch</h2><p class="mb-10 max-w-md text-base leading-relaxed text-slate-400">Contact our office to schedule your consultation today.</p><div class="space-y-8">' .
          '<div><p class="text-xs font-bold uppercase tracking-widest text-sky-500">Clinic Address</p><p class="mt-1 pre-line text-sm text-slate-300">' . h($d['address']) . '</p></div>' .
          '<div><p class="text-xs font-bold uppercase tracking-widest text-sky-500">Phone</p><p class="mt-1 text-sm text-slate-300">' . h($d['phone']) . '</p></div>' .
          '<div><p class="text-xs font-bold uppercase tracking-widest text-sky-500">Hours</p><p class="mt-1 text-sm text-slate-300">' . h($d['hours']) . '</p></div>' .
        '</div></div><div class="rounded-3xl border border-slate-100 bg-white p-8 text-slate-900 shadow-2xl lg:p-10">' . $form . '</div></div></div></section>' .
        '<footer class="border-t border-white/5 bg-slate-950 py-10"><div class="mx-auto max-w-7xl px-6 text-center"><p class="text-xs tracking-wide text-slate-500">&copy; ' . $year . ' ' . h($d['doctorName']) . ' ' . h($d['specialty']) . '. All rights reserved.</p></div></footer>' .
        '</div>';
}

/* ─── Template 3: Teal (clinical, Plus Jakarta Sans) ─────────────────────── */
function template3(array $d, ?string $cta): string {
    $year     = date('Y');
    $checkSvg = '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>';
    $achievements = implode('', array_map(
        fn($a) => '<li class="flex items-start"><span class="mt-0.5 rounded bg-teal-100 p-0.5 text-teal-700">' . $checkSvg . '</span><span class="ml-3 text-sm font-medium text-stone-700">' . h($a) . '</span></li>',
        $d['achievements']
    ));
    $services = implode('', array_map(
        fn($s) =>
            '<div class="rounded-xl border border-teal-100/50 bg-white p-8 shadow-sm transition hover:border-teal-700/30">' .
              '<div class="mb-6 flex h-12 w-12 items-center justify-center rounded bg-teal-700 text-white shadow-md">' . ICON_SERVICE . '</div>' .
              '<h3 class="mb-2 text-xl font-bold text-teal-950">' . h($s['title']) . '</h3>' .
              '<p class="text-sm leading-relaxed text-stone-600">' . h($s['description']) . '</p>' .
            '</div>',
        $d['services']
    ));
    $form  = leadForm([
        'label'  => 'mb-1 block text-xs font-bold uppercase text-stone-500',
        'input'  => 'block w-full rounded border border-stone-200 bg-stone-50 px-4 py-3 text-sm focus:border-teal-700 focus:bg-white focus:outline-none',
        'button' => 'w-full rounded bg-teal-700 px-4 py-3.5 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-teal-800 disabled:opacity-60',
    ]);
    $creds = $d['credentials'] ? ', ' . h($d['credentials']) : '';
    $ta    = ctaAttrs($cta);
    return
        '<div style="font-family:\'Plus Jakarta Sans\',Inter,sans-serif" class="bg-white text-stone-800 antialiased">' .
        '<nav class="sticky top-0 z-50 border-b border-teal-100/50 bg-white/90 backdrop-blur"><div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div class="flex h-20 items-center justify-between">' .
          '<div class="flex items-center"><span class="text-2xl font-extrabold tracking-tight text-teal-950">' . h($d['doctorName']) . '</span><span class="ml-3 hidden rounded bg-teal-50 px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-teal-700 sm:block">' . h($d['specialty']) . '</span></div>' .
          '<div class="hidden space-x-8 md:flex"><a href="#about" class="text-sm font-semibold text-stone-600 hover:text-teal-700">About</a><a href="#services" class="text-sm font-semibold text-stone-600 hover:text-teal-700">Specialties</a><a href="#contact" class="text-sm font-semibold text-stone-600 hover:text-teal-700">Contact</a></div>' .
          '<a ' . $ta . ' class="rounded bg-teal-700 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-teal-800">Book Appointment</a>' .
        '</div></div></nav>' .
        '<section class="overflow-hidden bg-teal-50 py-12 lg:py-24"><div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div class="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">' .
          '<main class="z-10 lg:col-span-7"><div class="mx-auto max-w-xl lg:mx-0"><h1 class="text-4xl font-extrabold leading-tight text-teal-950 sm:text-5xl md:text-6xl">' . h($d['heroTitleLine1']) . ' <span class="font-normal italic text-teal-700">' . h($d['heroTitleLine2']) . '</span></h1><p class="mt-4 text-base leading-relaxed text-stone-600 sm:text-lg md:text-xl">' . h($d['heroTagline']) . '</p><div class="mt-8 flex flex-col gap-4 sm:flex-row"><a ' . $ta . ' class="flex items-center justify-center rounded bg-teal-700 px-6 py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-teal-800">Schedule Consultation</a><a href="#services" class="flex items-center justify-center rounded border border-stone-200 bg-white px-6 py-3.5 text-base font-bold text-stone-700 hover:bg-stone-50">Our Services</a></div></div></main>' .
          '<div class="relative h-[350px] w-full lg:col-span-5 lg:h-[500px]"><div class="absolute inset-0 translate-x-4 translate-y-4 rounded-2xl bg-teal-700/10"></div><img class="relative z-10 h-full w-full rounded-2xl border-4 border-white object-cover shadow-lg" src="' . h($d['heroImageUrl']) . '" alt="' . h($d['doctorName']) . '"></div>' .
        '</div></div></section>' .
        '<section id="about" class="border-b border-stone-100 bg-white py-24"><div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div class="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">' .
          '<div class="overflow-hidden rounded-2xl border-2 border-stone-100 shadow-lg"><img src="' . h($d['aboutImageUrl']) . '" alt="portrait" class="h-[450px] w-full object-cover"></div>' .
          '<div><h2 class="mb-3 border-l-4 border-teal-700 pl-3 text-xs font-extrabold uppercase tracking-widest text-teal-700">About The Doctor</h2><p class="text-3xl font-extrabold tracking-tight text-teal-950 sm:text-4xl">' . h($d['doctorName']) . $creds . '</p><p class="mt-4 pre-line text-base leading-relaxed text-stone-600">' . h($d['aboutBio']) . '</p><div class="mt-6 pt-6"><ul class="grid grid-cols-1 gap-3">' . $achievements . '</ul></div></div>' .
        '</div></div></section>' .
        '<section id="services" class="bg-teal-50 py-24"><div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div class="mb-16 max-w-3xl"><h2 class="mb-3 border-l-4 border-teal-700 pl-3 text-xs font-extrabold uppercase tracking-widest text-teal-700">Specialties</h2><p class="text-3xl font-extrabold tracking-tight text-teal-950 sm:text-4xl">' . h($d['servicesTitle']) . '</p><p class="mt-2 text-base text-stone-600">' . h($d['servicesSubtitle']) . '</p></div><div class="grid grid-cols-1 gap-6 md:grid-cols-3">' . $services . '</div></div></section>' .
        '<section id="contact" class="bg-teal-950 py-24 text-white"><div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div class="grid grid-cols-1 items-center gap-16 lg:grid-cols-12"><div class="lg:col-span-5"><h2 class="mb-4 text-3xl font-extrabold tracking-tight">Get in Touch</h2><p class="mb-8 text-base leading-relaxed text-teal-200/70">Contact our office to schedule your consultation today.</p><div class="space-y-6 border-l-2 border-teal-800 pl-6">' .
          '<div><p class="mb-1 text-xs font-bold uppercase tracking-widest text-teal-400">Clinic Address</p><span class="pre-line text-sm text-stone-300">' . h($d['address']) . '</span></div>' .
          '<div><p class="mb-1 text-xs font-bold uppercase tracking-widest text-teal-400">Phone Number</p><span class="text-sm text-stone-300">' . h($d['phone']) . '</span></div>' .
          '<div><p class="mb-1 text-xs font-bold uppercase tracking-widest text-teal-400">Hours of Operation</p><span class="text-sm text-stone-300">' . h($d['hours']) . '</span></div>' .
        '</div></div><div class="rounded-xl bg-white p-8 text-stone-800 shadow-xl lg:col-span-7">' . $form . '</div></div></div></section>' .
        '<footer class="border-t border-stone-900 bg-stone-950 py-10"><div class="mx-auto max-w-7xl px-4 text-center"><p class="text-xs text-stone-500">&copy; ' . $year . ' ' . h($d['doctorName']) . ' ' . h($d['specialty']) . '. All rights reserved.</p></div></footer>' .
        '</div>';
}

/* ─── Resolve template + profile ─────────────────────────────────────────── */
$profile   = [];
$fn        = null;
$cta       = null;
$pageTitle = '';

if (!$error) {
    $profile   = applyFallbacks($apiData['profile'] ?? [], $FALLBACK);
    $tpl       = $apiData['template'] ?? 'classic';
    $tplMap    = [
        '1' => 'template1', 'classic'  => 'template1',
        '2' => 'template2', 'premium'  => 'template2',
        '3' => 'template3', 'teal'     => 'template3', 'clinical' => 'template3',
    ];
    $fn        = $tplMap[$tpl] ?? 'template1';
    $pageTitle = trim(($profile['doctorName'] ?? '') . ' | ' . ($profile['specialty'] ?? ''));
} else {
    $pageTitle = $error['title'];
}
?>
<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><?= h($pageTitle) ?></title>
<?php if (!empty($profile['faviconUrl'])): ?>
  <link rel="icon" href="<?= h($profile['faviconUrl']) ?>">
<?php endif; ?>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <style>.pre-line { white-space: pre-line; }</style>
</head>
<body class="bg-slate-50 text-slate-800 antialiased">
<?php if ($error): ?>
<div class="flex min-h-screen flex-col items-center justify-center px-4 text-center">
  <h1 class="text-2xl font-bold text-slate-900"><?= h($error['title']) ?></h1>
  <p class="mt-2 max-w-md text-slate-500"><?= h($error['detail']) ?></p>
</div>
<?php else: ?>
<?= $fn($profile, $cta) ?>
<script>
(function () {
  "use strict";
  var CRM_BASE  = <?= json_encode(rtrim($crmBase, '/')) ?>;
  var CLIENT_ID = <?= json_encode($clientId) ?>;

  function attachForm() {
    var form = document.getElementById('lead-form');
    if (!form) return;
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var btn    = form.querySelector('button[type="submit"]');
      var errEl  = document.getElementById('lf-error');
      errEl.classList.add('hidden');
      var original = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Sending…';
      var payload = {
        name:    form.querySelector('#lf-name').value.trim(),
        phone:   form.querySelector('#lf-phone').value.trim(),
        message: form.querySelector('#lf-message').value.trim() || undefined,
        source:  'website-profile',
      };
      try {
        var res = await fetch(CRM_BASE + '/api/p/' + encodeURIComponent(CLIENT_ID) + '/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          var data = await res.json().catch(function () { return {}; });
          errEl.textContent = typeof data.error === 'string' ? data.error : "Couldn’t submit. Please try again.";
          errEl.classList.remove('hidden');
          btn.disabled = false;
          btn.textContent = original;
          return;
        }
        form.innerHTML =
          '<div class="py-6 text-center">' +
          '<p class="text-base font-semibold text-green-600">Thank you — we’ll be in touch shortly.</p>' +
          '<p class="mt-2 text-sm text-gray-500">Your request has been received. Someone from our team will reach out to confirm your appointment.</p>' +
          '</div>';
      } catch (err) {
        errEl.textContent = 'Network error. Please try again.';
        errEl.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = original;
      }
    });
  }

  attachForm();
})();
</script>
<?php endif; ?>
</body>
</html>
