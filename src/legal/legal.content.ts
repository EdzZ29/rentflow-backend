/**
 * Rentivo's legal documents, served to the web and mobile clients so both read
 * from one source rather than keeping separate copies in step.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * These are DRAFTS, written to describe what this codebase actually does with
 * user data. They are not legal advice and have not been reviewed by a lawyer.
 * Have counsel review them — and check them against the Philippine Data
 * Privacy Act (RA 10173), the Consumer Act (RA 7394), and the E-Commerce Act
 * (RA 8792) — before relying on them in production. Placeholders marked
 * [BRACKETED] must be filled in.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Bump LEGAL_VERSION whenever the substance changes: it's recorded against each
 * user's consent, so you can tell who agreed to which revision.
 */

export const LEGAL_VERSION = '2026-09-07';
export const LEGAL_EFFECTIVE_DATE = '7 September 2026';

// Fill these in before publishing.
const COMPANY = 'Rentivo';
const CONTACT_EMAIL = '[legal@rentivo.example]';
const DPO_EMAIL = '[privacy@rentivo.example]';
const ADDRESS = '[registered business address]';
const JURISDICTION = 'the Republic of the Philippines';

export interface LegalSection {
  heading: string;
  /** Paragraphs. Rendered in order, one block each. */
  body: string[];
  /** Optional bullet list rendered after the paragraphs. */
  bullets?: string[];
}

export interface LegalDocument {
  slug: string;
  title: string;
  /** One line, used for list rows and page subtitles. */
  summary: string;
  version: string;
  effectiveDate: string;
  sections: LegalSection[];
}

const privacyPolicy: LegalDocument = {
  slug: 'privacy-policy',
  title: 'Privacy Policy',
  summary: 'What personal data Rentivo collects, why, and what you can do about it.',
  version: LEGAL_VERSION,
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  sections: [
    {
      heading: 'Who we are',
      body: [
        `${COMPANY} operates a rental marketplace that connects people who want to rent items — vehicles, event equipment, cameras, tools and similar — with the businesses that own them. ${COMPANY} is the data controller for the personal data described here, and can be reached at ${CONTACT_EMAIL} or ${ADDRESS}.`,
        `Questions about how we handle your data can go to our Data Protection Officer at ${DPO_EMAIL}.`,
      ],
    },
    {
      heading: 'What we collect',
      body: ['We collect only what the service needs to function:'],
      bullets: [
        'Account details — your full name, email address, hashed password, and the role your account holds (customer, owner or administrator).',
        'Profile details — a profile photo, if you upload one.',
        'Business and listing details, if you are an owner — business name, category, description, location, contact number and photographs of the items you list.',
        'Booking details — the dates you book, the items involved, and any identification document you upload where an owner requires one to release goods.',
        'Reviews and support messages you write.',
        'Approximate location — where you allow it, so the app can show what is available near you. This is used to look up a place name and is not stored on our servers.',
        'Technical data — the device platform and app version, and the records our servers keep of requests made to them.',
      ],
    },
    {
      heading: 'How we use it',
      body: [
        'We use your data to create and secure your account, to show you listings, to let you make and manage bookings, to let owners fulfil those bookings, to handle support requests, and to detect and prevent misuse of the platform.',
        'We do not sell your personal data, and we do not use it for advertising profiling.',
      ],
    },
    {
      heading: 'Who we share it with',
      body: [
        'When you make a booking, the owner of that item receives the details they need to fulfil it — your name, contact email, the booking dates, and any identification document you supplied for that booking. Owners are independent businesses and are responsible for their own handling of that data.',
        'We also use service providers who process data on our behalf, including our hosting provider, our database provider, our email delivery provider, and our authentication provider. They act on our instructions and may not use your data for their own purposes.',
        'We disclose data to authorities only where we are legally required to.',
      ],
    },
    {
      heading: 'How long we keep it',
      body: [
        'Account data is kept while your account is open. Booking records are kept for as long as we need them for tax, accounting and dispute-resolution purposes. Identification documents uploaded for a booking are kept only as long as that booking remains open to dispute, and are then deleted.',
        'You can ask us to delete your account at any time; see below.',
      ],
    },
    {
      heading: 'Your rights',
      body: [
        `Under the Philippine Data Privacy Act you have the right to be informed, to access your data, to correct it, to object to its processing, to have it erased or blocked, to data portability, and to be indemnified for damages. Write to ${DPO_EMAIL} to exercise any of these and we will respond within the period the law allows.`,
        'You may also lodge a complaint with the National Privacy Commission.',
      ],
    },
    {
      heading: 'Security',
      body: [
        'Passwords are stored only as salted bcrypt hashes — never in a form we can read. Sessions on the web use an httpOnly cookie so that page scripts cannot read your session token; the mobile app keeps its token in the device secure store. Traffic to our API is encrypted in transit.',
        'No system is perfectly secure. If a breach affects your personal data we will notify you and the National Privacy Commission as the law requires.',
      ],
    },
    {
      heading: 'Children',
      body: [
        'Rentivo is not intended for anyone under 18. We do not knowingly collect data from children, and will delete such data if we discover it.',
      ],
    },
    {
      heading: 'Changes',
      body: [
        `We may revise this policy. The version and effective date are shown at the top of this page, and material changes will be notified in the app or by email. This revision is ${LEGAL_VERSION}.`,
      ],
    },
  ],
};

const termsAndConditions: LegalDocument = {
  slug: 'terms-and-conditions',
  title: 'Terms and Conditions',
  summary: 'The agreement between you and Rentivo when you use the platform.',
  version: LEGAL_VERSION,
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  sections: [
    {
      heading: 'Agreement',
      body: [
        `By creating an account or using ${COMPANY}, you agree to these Terms. If you do not agree, do not use the service.`,
      ],
    },
    {
      heading: 'What Rentivo is',
      body: [
        'Rentivo is a marketplace. We provide the platform on which rental businesses list items and customers book them. We are not the owner, lessor or supplier of any listed item, we do not inspect items, and we are not a party to the rental agreement between an owner and a customer.',
        'The rental itself is a contract between you and the owner, on the terms and rental rules shown on that listing.',
      ],
    },
    {
      heading: 'Your account',
      body: [
        'You must be at least 18 and provide accurate details. You are responsible for keeping your password confidential and for everything done under your account. Tell us promptly if you believe it has been compromised.',
      ],
    },
    {
      heading: 'If you are an owner',
      body: ['Owners who list items agree to:'],
      bullets: [
        'describe items accurately, including condition, price, rental rules and cancellation policy;',
        'hold the right to rent out everything they list, and to carry any licence or insurance the law requires;',
        'honour confirmed bookings, and handle customer data received through a booking lawfully;',
        'keep their own listings, availability and pricing up to date.',
      ],
    },
    {
      heading: 'If you are a customer',
      body: ['Customers who book items agree to:'],
      bullets: [
        'use items only as the listing and its rental rules permit;',
        'return items on time and in the condition received, allowing for fair wear;',
        'be responsible to the owner for loss or damage caused while the item is in your care;',
        'provide genuine identification where an owner requires it to release goods.',
      ],
    },
    {
      heading: 'Bookings, pricing and payment',
      body: [
        'Prices, deposits and any fees are set by the owner and shown on the listing before you book. A booking is confirmed only when the owner accepts it. Payment arrangements are as stated on the listing and, unless we say otherwise in the app, are settled directly between you and the owner.',
      ],
    },
    {
      heading: 'Cancellations and refunds',
      body: [
        'Cancellations and refunds are governed by the Refund Policy and by the cancellation policy on the listing itself. Nothing in these Terms limits your rights under the Consumer Act of the Philippines.',
      ],
    },
    {
      heading: 'Subscriptions for owners',
      body: [
        'Owners may subscribe to a paid plan. Plan features, limits and prices are shown at the point of purchase. Marketplace visibility of your listings depends on holding an active plan that includes it.',
      ],
    },
    {
      heading: 'What you may not do',
      body: ['You must not:'],
      bullets: [
        'list or book anything illegal, stolen, or that you have no right to rent;',
        'impersonate another person, or create accounts to evade a suspension;',
        'post false reviews, or manipulate ratings;',
        'scrape, overload, probe or interfere with the platform or its security;',
        'use the platform to harass or defraud anyone.',
      ],
    },
    {
      heading: 'Content you post',
      body: [
        'You keep ownership of the text and photographs you upload, and grant us a licence to host and display them for the purpose of running the service. You are responsible for having the right to post them. We may remove content that breaches these Terms or the law.',
      ],
    },
    {
      heading: 'Availability and liability',
      body: [
        'We provide the platform as it is and do not promise it will be uninterrupted or error-free. To the extent the law allows, we are not liable for the condition, safety, legality or performance of any listed item, nor for the conduct of any owner or customer.',
        'Nothing here excludes liability that cannot lawfully be excluded, including for death or personal injury caused by negligence, or for fraud.',
      ],
    },
    {
      heading: 'Suspension and termination',
      body: [
        'You may close your account at any time. We may suspend or close an account that breaches these Terms, or where we are required to by law. Obligations already incurred — an open booking, or money owed — survive closure.',
      ],
    },
    {
      heading: 'Governing law',
      body: [
        `These Terms are governed by the laws of ${JURISDICTION}, and disputes are subject to the exclusive jurisdiction of its courts.`,
      ],
    },
    {
      heading: 'Contact',
      body: [`Questions about these Terms: ${CONTACT_EMAIL}.`],
    },
  ],
};

const cookiePolicy: LegalDocument = {
  slug: 'cookie-policy',
  title: 'Cookie Policy',
  summary: 'The cookies and on-device storage Rentivo uses, and how to control them.',
  version: LEGAL_VERSION,
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  sections: [
    {
      heading: 'What this covers',
      body: [
        'This policy covers cookies on our website and the equivalent on-device storage the mobile app uses. We keep both to a minimum: everything below is needed to run the service, and none of it is used for advertising.',
      ],
    },
    {
      heading: 'What we use on the web',
      body: ['The website sets the following:'],
      bullets: [
        'access_token — an httpOnly session cookie set when you sign in, so that our servers know it is you on each request. It cannot be read by page scripts, is marked SameSite=Lax, is sent over HTTPS in production, and expires after seven days or when you sign out.',
        'Authentication-provider cookies — where you sign in through a linked provider, that provider sets its own session cookies under its own policy.',
        'Local storage — small preferences such as your chosen listing layout, so the site remembers how you like to browse.',
      ],
    },
    {
      heading: 'What we use in the app',
      body: ['The mobile app does not use cookies. Instead it keeps:'],
      bullets: [
        'your session token in the device secure store (Keychain on iOS, Keystore-backed storage on Android), so you stay signed in between launches;',
        'a small flag recording that you have seen the introduction screens.',
      ],
    },
    {
      heading: 'What we do not use',
      body: [
        'We do not set advertising or cross-site tracking cookies, and we do not sell data gathered from cookies.',
      ],
    },
    {
      heading: 'Controlling them',
      body: [
        'You can clear or block cookies in your browser settings, and clear app storage from your device settings. Blocking the session cookie will sign you out and prevent you from signing back in, since it is what carries your session.',
      ],
    },
    {
      heading: 'Contact',
      body: [`Questions about this policy: ${DPO_EMAIL}.`],
    },
  ],
};

const refundPolicy: LegalDocument = {
  slug: 'refund-policy',
  title: 'Refund Policy',
  summary: 'When a booking can be cancelled, and how refunds are handled.',
  version: LEGAL_VERSION,
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  sections: [
    {
      heading: 'How refunds work here',
      body: [
        'Rentivo is a marketplace, and the rental contract is between you and the owner. Each listing carries its own cancellation policy, set by that owner and shown before you book. That policy governs your booking. This page explains the framework around it and the minimum we require of owners.',
      ],
    },
    {
      heading: 'Cancelling a booking',
      body: [
        'You can request a cancellation from your bookings at any time before the item is released to you. What you get back depends on the listing’s cancellation policy and how close to the start date you cancel. Many owners offer a full refund up to a stated cut-off — commonly 48 hours before pickup — and a partial or no refund after it.',
        'Once an item has been released to you, the rental has begun and the cancellation policy no longer applies.',
      ],
    },
    {
      heading: 'When you are always entitled to a refund',
      body: ['Regardless of the listing’s policy, you are entitled to a full refund where:'],
      bullets: [
        'the owner cancels the booking, or fails to make the item available at the agreed time and place;',
        'the item delivered is materially different from its description;',
        'the item is unsafe or unfit for the purpose described.',
      ],
    },
    {
      heading: 'Deposits, damage and late returns',
      body: [
        'Where an owner takes a security deposit, it must be returned within a reasonable period after the item comes back, less only amounts properly attributable to loss, damage beyond fair wear, or a late return — and the owner must be able to substantiate any deduction.',
      ],
    },
    {
      heading: 'How refunds are issued',
      body: [
        'Refunds are made by the owner, by the same method you paid, unless you agree otherwise. Where payment was settled directly with the owner, the refund is settled directly too.',
      ],
    },
    {
      heading: 'Subscriptions',
      body: [
        'Owner subscription plans are billed for the period chosen. Cancelling stops future billing and your plan runs to the end of the period already paid for. Part-used periods are not refunded except where the law requires it.',
      ],
    },
    {
      heading: 'Disputes',
      body: [
        `Raise a refund dispute with the owner first through the booking. If that does not resolve it, open a support ticket and we will help mediate. We can act on platform matters — visibility, account standing, records — but we cannot compel a payment between you and an owner. Escalate unresolved cases to ${CONTACT_EMAIL}.`,
        'Nothing in this policy limits your rights under the Consumer Act of the Philippines.',
      ],
    },
  ],
};

const formConsent: LegalDocument = {
  slug: 'form-consent',
  title: 'Form Consent',
  summary: 'What you agree to when you submit a form on Rentivo.',
  version: LEGAL_VERSION,
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  sections: [
    {
      heading: 'Why we ask',
      body: [
        'The Philippine Data Privacy Act requires that we obtain your informed consent before processing your personal data. Where you see a consent checkbox on a Rentivo form, ticking it records that consent. This page sets out what you are agreeing to at each point.',
      ],
    },
    {
      heading: 'Creating an account',
      body: [
        'When you register you give us your name, email address and a password, and you agree to the Terms and Conditions and the Privacy Policy. We record the date and the version of those documents you agreed to, so it is clear what you accepted. We use these details to create and secure your account and to contact you about your bookings.',
      ],
    },
    {
      heading: 'Making a booking',
      body: [
        'When you submit a booking you agree that the details necessary to fulfil it — your name, contact email, the dates, and any identification document the owner requires — are passed to that owner. You also accept that listing’s rental rules and cancellation policy.',
      ],
    },
    {
      heading: 'Uploading identification',
      body: [
        'Some owners require an identification document before releasing goods. An identification document is sensitive personal information, and we ask for it only where an owner requires it for a specific booking. It is shared only with that owner, for that booking, and deleted once the booking is no longer open to dispute.',
      ],
    },
    {
      heading: 'Reviews and support',
      body: [
        'A review you submit is published with your display name against the item you rented. A support ticket you open is visible to our support staff and, where the issue concerns a specific booking, to the owner involved.',
      ],
    },
    {
      heading: 'Location',
      body: [
        'The mobile app asks your permission before using your location, and only to show what is available nearby. Your coordinates are turned into a place name on your device and are not sent to or stored by us. You can refuse, and the app continues to work.',
      ],
    },
    {
      heading: 'Marketing',
      body: [
        'We will not send you marketing messages unless you separately opt in, and you can withdraw that at any time without affecting your account.',
      ],
    },
    {
      heading: 'Withdrawing consent',
      body: [
        `You may withdraw consent at any time by writing to ${DPO_EMAIL} or by closing your account. Withdrawal does not affect processing already carried out, nor data we must keep for tax, accounting or legal reasons. Because we cannot operate an account without processing the basics, withdrawing consent for that generally means closing the account.`,
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  privacyPolicy,
  termsAndConditions,
  cookiePolicy,
  refundPolicy,
  formConsent,
];

/** Slug → document, for the single-document endpoint. */
export const LEGAL_BY_SLUG: Record<string, LegalDocument> = Object.fromEntries(
  LEGAL_DOCUMENTS.map((d) => [d.slug, d]),
);
