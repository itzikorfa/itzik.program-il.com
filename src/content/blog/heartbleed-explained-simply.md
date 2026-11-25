---
title: Heartbleed, explained simply
date: 2026-11-26
summary: "Famous security bugs, part 1: the 2014 bug that made the internet's padlock leak passwords and secret keys, explained for people who don't work in security."
tags:
  - security
  - cve
  - explained
draft: false
---

*Famous security bugs, explained simply: part 1.* A series about real security flaws that made headlines, written for people who **don't** work in security. Each story answers four questions: what was the problem, how was it found, why should you care, and did anyone actually get hurt?

## First: what is a "CVE"?

When someone finds a security flaw in software, it gets an ID number so everyone talks about the same thing. That ID is called a **CVE** (Common Vulnerabilities and Exposures).

It looks like this: **CVE-2014-0160**

- `CVE`: it's a security flaw
- `2014`: the year the number was given out
- `0160`: its number in that year's list

Think of it like a case number at a police station. It doesn't tell you how bad something is, only how to look it up.

Some flaws get so famous that they get a nickname, like **Heartbleed** or **Log4Shell**.

### A few words you'll see

| Word | What it means |
|------|---------------|
| **Vulnerability** | A weakness in software that a bad person could use |
| **Exploit** | The trick or tool that actually uses the weakness |
| **Patch** | The fix, usually delivered as an update |
| **Attacker** | The person trying to break in |
| **Server** | A computer that runs a website or app for many people |

---


**ID:** CVE-2014-0160
**Where:** OpenSSL, the software that makes the padlock 🔒 in your browser work
**In one sentence:** A tiny mistake let anyone ask a website's computer to hand over pieces of its memory, including passwords and secret keys.

---

## 1. What was the problem?

When you visit a website with the 🔒 padlock, your connection is encrypted, so nobody in between can read it. On a huge part of the internet, that encryption was done by free software called **OpenSSL**.

OpenSSL has a small feature called the **"heartbeat."** It's how your computer checks that the website is still there:

> **You:** "Are you there? Reply with the word *HAT* (3 letters)."
> **Server:** "HAT"

The bug was simple: **the server never checked whether you were telling the truth about the length.**

> **Attacker:** "Are you there? Reply with the word *HAT* (500 letters)."
> **Server:** "HAT... *plus 497 more letters of whatever happened to be in my memory*"

That extra memory could contain:

- other people's **passwords** and usernames
- **session cookies** (the thing that keeps you logged in)
- the website's **secret encryption key**, which is the master key to the padlock itself

An attacker could repeat this as many times as they wanted, and **it left no trace in normal logs.**

The cartoonist xkcd explained it perfectly in one comic: https://xkcd.com/1354/

---

## 2. How was it found?

- The mistake was added to the code in **late 2011** by a volunteer developer. Another developer reviewed it, and neither noticed. It shipped in **March 2012**.
- It sat there unnoticed for **about two years.**
- In **April 2014**, two separate teams found it at nearly the same time:
  - **Neel Mehta** at Google's security team
  - Engineers at **Codenomicon**, a Finnish security company, while testing their own tools
- Codenomicon gave it the name **"Heartbleed,"** drew the bleeding-heart logo, and made a website (heartbleed.com) to explain it.
- The fix and the public announcement came out on **April 7, 2014.**

That was a first. A bug got a name, a logo and a website, which is why ordinary people heard about it on the news. Many famous bugs since then have followed the same idea.

---

## 3. Why should you care?

- **It hit a huge part of the internet.** Around **17% of secure websites** (roughly half a million) were estimated to be vulnerable, including big names.
- **The padlock was supposed to mean "safe."** Heartbleed showed that the lock itself could be broken.
- **You couldn't protect yourself.** The problem was on the website's side. Users could only wait for the site to fix it and then **change their passwords.**
- **The whole internet depended on a few volunteers.** OpenSSL was maintained by a very small team with almost no money. After Heartbleed, big tech companies started funding important open-source projects (the *Core Infrastructure Initiative*).

**The lesson:** software that millions of people rely on is sometimes held together by a handful of unpaid people. A single missing check can affect everyone.

---

## 4. Did anyone actually get hurt?

**Yes.** Here are some confirmed cases:

| Who | What happened |
|-----|---------------|
| **Canada Revenue Agency** (Canada's tax office) | About **900 people's Social Insurance Numbers** were stolen in the days after the bug went public. A 19-year-old student was arrested. The tax-filing deadline was extended. |
| **Mumsnet** (UK parenting website) | Attackers used Heartbleed to grab user passwords and break into accounts. All users were asked to change passwords. |
| **Community Health Systems** (US hospital chain) | Data on about **4.5 million patients** was stolen in 2014. Security researchers said the attackers got in through Heartbleed on an unpatched network device. |

**What we don't know:** because attacks left no trace, nobody can say for sure how much was stolen *before* the bug became public. Many companies had to assume the worst and replace their keys and passwords.

---

## Quick summary

| | |
|---|---|
| **The flaw** | The server trusted what you said about the length of your message |
| **Found by** | Google (Neel Mehta) and Codenomicon, independently, in 2014 |
| **Hidden for** | About 2 years |
| **Scale** | About 17% of secure websites |
| **Real harm** | Yes: stolen tax IDs, hacked accounts, 4.5M patient records |
| **Big lesson** | Critical internet software needs real support, not just volunteers |

---

## Sources

- Official Heartbleed site (by Codenomicon): https://heartbleed.com/
- CVE record: https://nvd.nist.gov/vuln/detail/CVE-2014-0160
- xkcd comic explaining it: https://xkcd.com/1354/
- Canada Revenue Agency breach: https://www.cbc.ca/news/politics/heartbleed-bug-revenue-canada-breach-1.2609929
- Community Health Systems breach: https://www.trustedsec.com/blog/hackers-attacked-community-health-systems-via-heartbleed/
