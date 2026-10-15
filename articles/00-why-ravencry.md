# Why We Built RAVENCRY

Nigeria has one of the highest rates of kidnapping incidents in Africa. Thousands of cases are recorded each year. When a child goes missing in Zamfara or a commuter is abducted on the Abuja-Kaduna highway, the first hours matter more than anything else.

The problem isn't just the crime. It's the gap between when someone goes missing and when anyone finds out.

If you're in Lagos with a smartphone, you might post on Twitter or forward a message on WhatsApp. That message bounces around group chats for a few hours, then disappears into the noise. If you're in a village in Katsina with a feature phone and no internet, you have no way to reach anyone beyond your immediate neighbors. If you speak Hausa, the systems that do exist probably don't understand you.

There is no Amber Alert equivalent in Nigeria. There is no national rapid alert system. What exists is fragmented: a NAPTIP hotline that isn't widely known, some NGO WhatsApp groups, police channels that most citizens don't trust. None of it is fast. None of it is automated. None of it spans the linguistic and technological diversity of the country.

We built RAVENCRY to fill that gap. We had three constraints that shaped every decision:

**First, any device. Any network.** Smartphone ownership is lower in rural and northern communities, but not zero. Millions of Nigerians in the north use smartphones. Millions more use feature phones. RAVENCRY accepts reports through WhatsApp (for smartphone users), USSD via `*384#` (for feature phones with zero internet), Telegram, SMS, and a Progressive Web App that works offline on 3G. Five channels, one pipeline.

**Second, five languages, not one.** The systems that exist operate in English. Nigeria has over 500 languages. For an alert system to work, it has to understand what a worried mother is saying in Hausa, Yoruba, Igbo, or Pidgin — including code-switching between them. We chose Qwen as our AI triage layer specifically because it handles Nigerian languages better than any other model we tested.

**Third, it has to ship.** This isn't a research paper or a pitch deck. It's a working system running on AWS infrastructure — Aurora PostgreSQL, DynamoDB, S3 — frontend on Vercel, compute on EC2, all in Docker Compose. One command deploys the entire stack. The code is public. The architecture is documented. It was built for a hackathon, but it was built to last.

The name RAVENCRY comes from ravens — birds that are watchful, intelligent, and communicate danger to their flock. That's what we wanted this system to be. Not another app that sits on a phone. A watchful layer over the country that sees, understands, and alerts.

The statistics don't have a face. But behind every kidnapping statistic is a family waiting for news. RAVENCRY exists to make sure they don't wait alone.
