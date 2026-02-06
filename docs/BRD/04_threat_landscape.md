# 04 -- Cybersecurity Threat Landscape & Training Content Requirements

## The DMZ: Archive Gate -- Business Requirements Document

**Document ID:** BRD-04
**Version:** 1.0
**Date:** 2026-02-05
**Classification:** Internal -- Strategic Planning
**Author:** Threat Intelligence Division, Matrices GmbH

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Core Threat Categories for Training](#2-core-threat-categories-for-training)
   - 2.1 [Phishing](#21-phishing)
   - 2.2 [Social Engineering](#22-social-engineering)
   - 2.3 [Malware](#23-malware)
   - 2.4 [Password Security](#24-password-security)
   - 2.5 [Data Protection](#25-data-protection)
   - 2.6 [Physical Security](#26-physical-security)
   - 2.7 [Network Security](#27-network-security)
   - 2.8 [Cloud Security](#28-cloud-security)
   - 2.9 [Supply Chain Attacks](#29-supply-chain-attacks)
   - 2.10 [Insider Threats](#210-insider-threats)
   - 2.11 [AI-Powered Threats](#211-ai-powered-threats)
   - 2.12 [IoT Security](#212-iot-security)
3. [Behavioral Change Objectives](#3-behavioral-change-objectives)
4. [Threat Intelligence Integration](#4-threat-intelligence-integration)
5. [Difficulty Progression](#5-difficulty-progression)
6. [Real-World Scenario Mapping](#6-real-world-scenario-mapping-the-dmz-archive-gate)
7. [Appendix A: Threat-to-Mechanic Cross-Reference Matrix](#appendix-a-threat-to-mechanic-cross-reference-matrix)
8. [Appendix B: MITRE ATT&CK Technique Coverage](#appendix-b-mitre-attck-technique-coverage)
9. [Appendix C: Sources and References](#appendix-c-sources-and-references)

---

## 1. Executive Summary

The cybersecurity threat landscape in 2025-2026 is defined by three converging forces: the weaponization of artificial intelligence by threat actors, the continued expansion of the attack surface through cloud, IoT, and supply chain dependencies, and the persistent vulnerability of human behavior as the weakest link in organizational defense. This document provides an exhaustive analysis of the threat categories that "The DMZ: Archive Gate" must address through its gamified training mechanics, along with measurable behavioral change objectives, threat intelligence integration strategies, adaptive difficulty frameworks, and a detailed mapping of game mechanics to real-world cybersecurity threats.

### The Current State of the Threat Landscape

The numbers paint an unambiguous picture of escalation:

- **3.4 billion** phishing emails are sent daily, comprising 1.2% of all global email traffic.
- **7,200** publicly reported ransomware attacks occurred in 2025, a 47% increase over 2024.
- **82.6%** of phishing emails now contain AI-generated content.
- **$17.4 million** is the average annual cost of insider threat incidents per organization.
- **820,000** IoT attacks occur daily.
- **94%** of passwords exposed in breaches are reused across multiple accounts.
- **85%** of CISOs lack complete visibility into their software supply chains.

These statistics are not abstract. They represent the operational reality that every employee, from the mailroom to the boardroom, must be prepared to navigate. "The DMZ: Archive Gate" transforms this preparation from passive compliance training into active, scenario-driven skill development through its core gameplay loop: receiving requests, verifying identity, assessing threats, managing resources, and surviving breaches.

### Why This Document Matters for The DMZ: Archive Gate

The game's premise -- a post-Stuxnet world where Matrices GmbH operates one of the last functioning data centers -- creates a high-stakes environment that mirrors the real-world consequences of cybersecurity failures. Every access request could be legitimate or a trap. Every upgrade introduces new attack vectors. Every decision has cascading consequences. This document ensures that the threats players face in-game are grounded in real-world threat intelligence, that the difficulty scales authentically, and that measurable behavioral change is the outcome.

---

## 2. Core Threat Categories for Training

### 2.1 Phishing

#### 2.1.1 Threat Overview

Phishing remains the single most prevalent attack vector in the cybersecurity landscape. The Anti-Phishing Working Group (APWG) tracked 1,003,924 phishing attacks in Q1 2025 alone -- the highest quarterly total since late 2023. The attack has evolved far beyond the misspelled Nigerian prince emails of the 2000s into a multi-channel, AI-enhanced, and highly targeted threat ecosystem.

#### 2.1.2 Sub-Categories

**Email Phishing (Bulk/Commodity)**

- The foundational phishing attack: mass-distributed emails impersonating trusted brands, services, or contacts.
- Relies on volume -- sending millions of emails knowing that even a 0.1% click rate yields thousands of compromised accounts.
- Common lures: account verification, password reset, invoice payment, delivery notification, tax refund.
- AI-generated phishing emails now achieve a **54% click-through rate**, compared to just 12% for human-written messages.
- Malware-laden emails surged **131% year-over-year** in 2025, accompanied by a 34.7% rise in email scams and a 21% increase in phishing overall.

**Spear Phishing**

- Targeted phishing directed at specific individuals or organizations, using personal information to increase credibility.
- Attackers research targets through social media, corporate websites, press releases, and data broker services.
- Emails reference real projects, colleagues, or events to bypass suspicion.
- Spear phishing accounts for approximately **65% of successful targeted attacks** against enterprises.
- The average cost of a spear phishing breach is **$4.76 million**.

**Whaling**

- Spear phishing aimed specifically at C-suite executives, board members, and other high-value targets.
- Whaling contributes to approximately **27% of phishing-related incidents**.
- Attacks often impersonate legal counsel, regulatory bodies, or board members requesting urgent wire transfers.
- Business Email Compromise (BEC), a whaling derivative, caused **$2.9 billion in reported losses** in 2024.

**Vishing (Voice Phishing)**

- Voice-based social engineering attacks conducted over phone calls.
- CrowdStrike observed an **explosive 442% increase** in vishing incidents between early and late 2024, with the trend accelerating through 2025.
- AI voice cloning now requires as little as **3 seconds of audio** to create an 85% voice match.
- Voice phishing enabled **$40 billion in fraud** in 2025.
- CEO fraud via vishing now targets at least **400 companies per day**.

**Smishing (SMS Phishing)**

- Phishing attacks delivered via SMS text messages.
- **76% of businesses** were hit by smishing in the past year.
- Incidents increased **328%** with average losses of **$800 per incident** globally.
- Common vectors: fake delivery notifications, bank alerts, MFA bypass attempts, toll violations.
- Mobile devices lack many of the email security controls (SPF, DKIM, DMARC) that protect desktop email.

**Quishing (QR Code Phishing)**

- Phishing attacks that use QR codes to redirect victims to malicious websites.
- Nearly **one in four phishing campaigns** in 2025 used QR codes or malicious links disguised as MFA prompts.
- A surge in PDF-based phishing has been linked to Microsoft's macro-blocking policy, with virtually all observed malicious PDFs containing quishing attempts.
- QR codes bypass traditional URL scanning because the encoded URL is not visible to email security gateways.
- Physical quishing (malicious QR codes placed over legitimate ones in restaurants, parking meters, etc.) is an emerging hybrid physical/digital attack.

#### 2.1.3 Training Content Requirements

| Skill Area              | Beginner                          | Intermediate                                               | Advanced                                   |
| ----------------------- | --------------------------------- | ---------------------------------------------------------- | ------------------------------------------ |
| Email Header Analysis   | Recognize spoofed sender names    | Inspect full headers for SPF/DKIM failures                 | Trace email routing through relay servers  |
| URL Inspection          | Hover before clicking             | Identify homoglyph domains (e.g., rn vs. m)                | Decode URL-encoded payloads and redirects  |
| Attachment Safety       | Never open unexpected attachments | Check file extensions vs. MIME types                       | Analyze embedded macros and scripts        |
| Urgency Recognition     | Pause when pressured              | Cross-reference unusual requests through separate channels | Identify AI-crafted urgency patterns       |
| Multi-Channel Awareness | Recognize email phishing          | Detect smishing and vishing                                | Identify coordinated multi-channel attacks |
| QR Code Hygiene         | Question unexpected QR codes      | Use QR scanner with URL preview                            | Recognize tampered physical QR codes       |

#### 2.1.4 In-Game Mapping

In "The DMZ: Archive Gate," phishing maps directly to the **Email Access Request** system. Every incoming request for data center access arrives via email. Players must analyze sender information, verify claims of identity, check for inconsistencies in the request narrative, and cross-reference against known threat indicators -- mirroring the exact cognitive process required to detect phishing in the real world. See Section 6 for detailed mechanic mappings.

---

### 2.2 Social Engineering

#### 2.2.1 Threat Overview

Social engineering is the art of manipulating people into performing actions or divulging information that compromises security. Unlike technical attacks that exploit software vulnerabilities, social engineering exploits human psychology -- trust, authority, fear, curiosity, and helpfulness. It is the foundational technique underlying phishing but extends far beyond email into every human interaction.

More than **86% of organizations** have encountered at least one AI-related social engineering incident. The sophistication of social engineering has increased dramatically with AI tools that can craft personalized pretexts, generate realistic personas, and maintain consistent deceptive narratives across multiple interactions.

#### 2.2.2 Sub-Categories

**Pretexting**

- The attacker creates a fabricated scenario (pretext) to engage the victim and gain their trust.
- Examples: impersonating a vendor conducting a survey, an IT helpdesk technician needing credentials for a system migration, a new employee needing building access.
- Pretexting is the backbone of all social engineering -- every phishing email, every vishing call, every physical intrusion begins with a pretext.
- AI has made pretexting dramatically more effective. Attackers can now generate entire corporate personas -- LinkedIn profiles, email histories, social media accounts -- that withstand casual verification.

**Baiting**

- Offering something enticing to lure the victim into a trap.
- Digital baiting: free software downloads bundled with malware, "leaked" documents that require credential entry to access, fake job postings that harvest personal information.
- Physical baiting: USB drives labeled "Salary Information Q4" left in parking lots, conference rooms, or restrooms.
- Baiting exploits curiosity and the perceived value of "free" or "exclusive" content.
- In 2025, baiting attacks increasingly use AI-generated "confidential" documents that appear to contain sensitive corporate information.

**Tailgating / Piggybacking**

- Gaining physical access to restricted areas by following authorized personnel through secured doors.
- The attacker may carry boxes to appear to need help, wear a fake employee badge, or simply walk confidently behind someone entering a secure area.
- In hybrid work environments, tailgating is exacerbated by the fact that employees may not recognize all colleagues.
- Multi-tenant office buildings are particularly vulnerable because employees from different companies share common access points.

**Quid Pro Quo**

- Offering a service or benefit in exchange for information or access.
- Classic example: calling employees and offering free IT support in exchange for their login credentials.
- Modern examples: offering to fix a "detected security issue" on someone's computer, providing a "free security audit" that actually installs surveillance tools.
- Tech support scams, which generated **$924 million in reported losses** in 2024, are a form of quid pro quo attack.

**Authority-Based Manipulation**

- Exploiting the human tendency to comply with requests from perceived authority figures.
- Impersonating executives, law enforcement, regulators, or auditors.
- Often combined with urgency: "The CEO needs this wire transfer completed before market close."
- Particularly effective in hierarchical organizations where questioning superiors is culturally discouraged.

**Reciprocity Exploitation**

- Providing a small favor or gift to create a sense of obligation in the target.
- Example: sending a small gift to a target employee, then following up with a request for "a small favor" that involves sharing access credentials or confidential information.

#### 2.2.3 Training Content Requirements

| Skill Area             | Beginner                                      | Intermediate                                 | Advanced                                       |
| ---------------------- | --------------------------------------------- | -------------------------------------------- | ---------------------------------------------- |
| Pretext Recognition    | Identify obviously suspicious stories         | Detect plausible but unverifiable claims     | Analyze AI-generated multi-layered pretexts    |
| Authority Verification | Question unexpected requests from "superiors" | Verify identity through independent channels | Recognize synthetic authority indicators       |
| Information Hygiene    | Avoid sharing passwords verbally              | Limit social media exposure of work details  | Compartmentalize information by need-to-know   |
| Physical Awareness     | Challenge unfamiliar visitors                 | Report tailgating attempts                   | Conduct social engineering penetration testing |
| Emotional Regulation   | Recognize urgency pressure                    | Resist flattery and reciprocity manipulation | Maintain skepticism under sustained pressure   |

#### 2.2.4 In-Game Mapping

Social engineering maps to the core decision-making loop of "The DMZ: Archive Gate." Every access request tells a story -- a university claiming to need data recovery, a government agency requesting emergency access, a corporation offering premium payment. Players must evaluate these pretexts under time pressure, cross-reference claimed identities against verification documents, and resist the emotional pull of sympathetic narratives. The **Phishing Analysis Worksheet** and **Verification Packet** mechanics directly train pretext analysis skills.

---

### 2.3 Malware

#### 2.3.1 Threat Overview

Malware -- malicious software designed to disrupt, damage, or gain unauthorized access to systems -- remains the primary payload delivered through social engineering and exploitation attacks. The malware landscape in 2025-2026 is characterized by increasing sophistication, commoditization through Malware-as-a-Service (MaaS) platforms, and the integration of AI for evasion and targeting.

#### 2.3.2 Sub-Categories

**Ransomware**

- Encrypts victim data and demands payment for decryption keys.
- **7,200 publicly reported ransomware attacks** occurred in 2025, a 47% increase over 2024.
- The average cost of a ransomware attack ranges between **$1.8 million and $5 million** per incident, including downtime, recovery, and reputational damage.
- Global ransomware damage costs are projected to reach **$57 billion annually**.
- Ransomware-as-a-Service (RaaS) has democratized the threat: Qilin, the most active group in mid-2025, carried out **81 attacks in a single month**.
- Double and triple extortion is now standard: encrypting data, threatening to leak it publicly, and attacking customers or partners if the ransom is not paid.
- Sector targeting is uneven: healthcare attacks up **45%**, education up **30%**, finance up **25%**.
- 2026 predictions indicate a strategic shift toward AI-assisted attacks, supply chain infiltration, and data-leak extortion over encryption.

**Trojans**

- Malware disguised as legitimate software that performs malicious actions once installed.
- Remote Access Trojans (RATs) provide attackers with persistent, stealthy access to victim systems.
- Banking trojans specifically target financial credentials and transaction data.
- Emotet, though disrupted multiple times, continues to resurface as a primary trojan/loader platform.
- Mobile trojans targeting Android and iOS have increased significantly, often distributed through sideloaded apps or compromised app stores.

**Worms**

- Self-replicating malware that spreads across networks without user interaction.
- Unlike viruses, worms do not need to attach to a host program.
- Network worms exploit vulnerabilities in network services to propagate.
- Supply chain worms -- malware that propagates through software supply chains -- are predicted to become a significant threat in 2026. Security researchers warn of "Shai-Hulud" style attacks (named after the sandworms of Dune) that burrow through interconnected vendor ecosystems.
- IoT worms that exploit default credentials to build botnets remain a persistent concern.

**Spyware**

- Software that covertly monitors and collects user activity, keystrokes, browsing history, and sensitive data.
- Commercial spyware (e.g., Pegasus, Predator) has been used against journalists, activists, and government officials.
- Stalkerware -- spyware installed on personal devices by abusive partners or employers -- is a growing ethical concern.
- Information-stealing malware ("infostealers") specifically targets credentials, cookies, cryptocurrency wallets, and session tokens. Infostealer infections were linked to **22% of all breaches** involving stolen credentials.

**Rootkits**

- Deeply embedded malware that modifies the operating system to hide its presence and maintain persistent access.
- Firmware rootkits survive operating system reinstallation and are extremely difficult to detect.
- UEFI rootkits target the boot process itself, compromising systems before any security software loads.
- Kernel-mode rootkits operate at the highest privilege level, intercepting system calls and hiding malicious processes.
- Detection typically requires specialized tools: memory forensics, trusted boot measurements, or hardware-based attestation.

**Fileless Malware**

- Malware that operates entirely in memory without writing files to disk, evading traditional antivirus detection.
- Uses legitimate system tools (PowerShell, WMI, .NET framework) to execute malicious actions -- a technique known as "living off the land."
- Fileless attacks increased **65%** in 2025 and are particularly difficult to detect with signature-based security tools.

**Cryptojacking**

- Unauthorized use of computing resources to mine cryptocurrency.
- Often delivered through compromised websites (browser-based mining) or installed alongside other malware.
- Cloud-based cryptojacking targets misconfigured cloud instances, spinning up compute resources at the victim's expense.
- While individually less damaging than ransomware, cryptojacking causes significant financial impact through increased energy costs and degraded system performance.

#### 2.3.3 Training Content Requirements

| Skill Area          | Beginner                                      | Intermediate                                 | Advanced                                   |
| ------------------- | --------------------------------------------- | -------------------------------------------- | ------------------------------------------ |
| Malware Recognition | Identify suspicious attachments and downloads | Recognize behavioral indicators of infection | Understand malware families and their TTPs |
| Ransomware Response | Do not pay without consulting security team   | Isolate infected systems immediately         | Execute incident response playbooks        |
| Safe Browsing       | Avoid suspicious websites                     | Recognize drive-by download indicators       | Understand browser exploitation techniques |
| Software Hygiene    | Install only approved software                | Verify software signatures and hashes        | Maintain software bills of materials       |
| Incident Reporting  | Know who to contact                           | Preserve forensic evidence                   | Document indicators of compromise          |

#### 2.3.4 In-Game Mapping

Malware maps to multiple game mechanics in "The DMZ: Archive Gate":

- **Supply chain malware hidden in backups** is an explicit primary threat. When players accept data for storage, some of that data may contain embedded malware.
- **Breach consequences** directly model ransomware: a successful breach triggers a ransom note costing total earnings divided by 10.
- **Upgrade management** models patch management -- every upgrade introduces new threat vectors, just as new software introduces new vulnerabilities.
- The **Threat Assessment Sheet** trains players to evaluate risk scores and known indicators, mirroring malware analysis in security operations.

---

### 2.4 Password Security

#### 2.4.1 Threat Overview

Password-based authentication remains the most common access control mechanism, and it remains fundamentally broken. After analyzing over **19 billion passwords** exposed in data breaches between April 2024 and April 2025, researchers discovered that **94% of passwords are reused or duplicated** across multiple accounts. Modern hacking tools can crack **96% of common passwords in less than one second**.

#### 2.4.2 Sub-Categories

**Brute Force Attacks**

- Systematic trial of all possible password combinations until the correct one is found.
- Verizon's 2025 DBIR reported a **37% increase** in brute force attacks against web applications.
- GPU-accelerated cracking rigs can test billions of combinations per second.
- An 8-character password using only lowercase letters can be cracked in under **5 seconds**; an 8-character password using uppercase, lowercase, numbers, and symbols can be cracked in under **8 hours**.
- Defenses: account lockout policies, rate limiting, progressive delays, CAPTCHA.

**Credential Stuffing**

- Using stolen username/password pairs from one breach to attempt login on other services, exploiting password reuse.
- Accounted for **22% of all data breaches** in 2024-2025, making it the single most common breach vector.
- Credential stuffing attempts comprise a median of **19% of all daily authentication events** across major platforms.
- Success rates range from **0.1% to 4%** -- seemingly low, but against millions of stolen credentials, even 0.1% yields thousands of compromised accounts.
- A 2025 mega-leak exposed approximately **16 billion credentials**, providing fresh ammunition for credential stuffing campaigns.

**Password Spraying**

- Attempting a small number of commonly used passwords against a large number of accounts simultaneously.
- Designed to avoid account lockout thresholds (e.g., trying "Password123" against 10,000 accounts rather than trying 10,000 passwords against one account).
- Particularly effective against organizations that enforce password complexity but not uniqueness or length.
- Common targets: Microsoft 365, VPN portals, remote desktop services, single sign-on systems.
- Machine learning models trained on leaked password dumps can now generate **highly targeted password guesses** based on user behavior, language patterns, job roles, and regional naming conventions.

**Dictionary Attacks**

- Using precompiled lists of likely passwords (common words, phrases, patterns) to attempt authentication.
- Hybrid dictionary attacks combine dictionary words with common substitutions (e.g., "p@ssw0rd"), appended numbers, and known patterns.
- Rainbow table attacks use precomputed hash chains to reverse password hashes.

**Keylogging**

- Hardware or software that records keystrokes to capture passwords as they are typed.
- Hardware keyloggers can be physically inserted between a keyboard and computer, requiring no software installation.
- Software keyloggers are often bundled with other malware or installed through social engineering.

#### 2.4.3 Training Content Requirements

| Skill Area                  | Beginner                              | Intermediate                                                 | Advanced                                          |
| --------------------------- | ------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------- |
| Password Creation           | Use 12+ character passphrases         | Understand entropy and password strength                     | Generate cryptographically strong passwords       |
| Password Management         | Do not reuse passwords                | Use a password manager for all accounts                      | Implement organizational password policies        |
| MFA Adoption                | Enable MFA on all accounts            | Understand MFA bypass techniques (MFA fatigue, SIM swapping) | Implement phishing-resistant MFA (FIDO2/WebAuthn) |
| Credential Monitoring       | Change passwords after known breaches | Monitor for credential exposure                              | Implement continuous credential screening         |
| Authentication Architecture | Understand why passwords matter       | Understand SSO and federated identity                        | Design zero-trust authentication flows            |

#### 2.4.4 In-Game Mapping

Password security maps to the **Access Constraints** and **Verification Packet** systems. Players must verify that applicants are who they claim to be -- a process analogous to authentication. Weak verification (accepting claims at face value) is the game equivalent of weak passwords. The escalating sophistication of adversaries in the game mirrors the escalation from brute force to AI-enhanced credential attacks.

---

### 2.5 Data Protection

#### 2.5.1 Threat Overview

Data is the asset that attackers ultimately seek to steal, encrypt, corrupt, or leverage. Effective data protection requires understanding what data you have, where it lives, how it moves, and who can access it. The average cost of a data breach in the US surged to **$10.22 million** in 2025, with breaches involving data stored across multiple environments taking **276 days on average** to identify and contain.

#### 2.5.2 Sub-Categories

**Data Classification**

- Categorizing data by sensitivity level (public, internal, confidential, restricted, top secret).
- Classification drives all other data protection decisions: who can access it, how it must be stored, how it can be transmitted, and when it must be destroyed.
- Most organizations fail at classification because they attempt to classify data after it is created rather than building classification into data creation workflows.
- Automated classification using AI/ML is improving but still requires human validation for edge cases.

**Data Handling Procedures**

- Policies governing how data is created, accessed, transmitted, stored, and destroyed at each classification level.
- Includes: encryption requirements for data at rest and in transit, approved storage locations, data retention periods, secure destruction methods.
- Human error in data handling remains the leading cause of data breaches: sending emails to wrong recipients, uploading files to public repositories, leaving printouts on shared printers.
- **63% of organizations** report external data oversharing as a significant concern.

**Data Loss Prevention (DLP)**

- Technologies and processes designed to detect and prevent unauthorized data exfiltration.
- Network DLP monitors data in transit (email, web uploads, file transfers).
- Endpoint DLP monitors data on user devices (USB copies, print jobs, screen captures).
- Cloud DLP monitors data in cloud storage and SaaS applications.
- **56% of employees** upload sensitive data to unauthorized SaaS applications, often without security team visibility.

**Encryption**

- Mathematical transformation of data into an unreadable format that can only be reversed with the correct key.
- Encryption at rest: protecting stored data (full-disk encryption, database encryption, file-level encryption).
- Encryption in transit: protecting data during transmission (TLS/SSL, VPN tunnels, encrypted email).
- End-to-end encryption: data is encrypted on the sender's device and only decrypted on the recipient's device.
- Post-quantum cryptography is an emerging concern: quantum computers may eventually break current RSA and elliptic curve encryption, requiring migration to quantum-resistant algorithms.

**Data Residency and Sovereignty**

- Legal requirements governing where data can be physically stored and processed.
- GDPR, CCPA, and similar regulations impose strict requirements on cross-border data transfers.
- Cloud computing complicates residency because data may be replicated across multiple geographic regions.

#### 2.5.3 Training Content Requirements

| Skill Area     | Beginner                          | Intermediate                                    | Advanced                                     |
| -------------- | --------------------------------- | ----------------------------------------------- | -------------------------------------------- |
| Classification | Identify basic sensitivity levels | Apply classification to complex data types      | Design and implement classification schemas  |
| Handling       | Follow basic data handling rules  | Understand DLP alerts and respond appropriately | Configure and tune DLP policies              |
| Encryption     | Understand why encryption matters | Use encryption tools correctly                  | Manage encryption keys and certificates      |
| Privacy        | Recognize PII and PHI             | Comply with GDPR/CCPA requirements              | Conduct privacy impact assessments           |
| Destruction    | Shred sensitive paper documents   | Securely wipe electronic media                  | Verify destruction through forensic analysis |

#### 2.5.4 In-Game Mapping

Data protection is the fundamental premise of "The DMZ: Archive Gate." The entire game is about protecting data in a post-collapse world where "data loss is existential, not just financial." The **Data Salvage Contract** and **Storage Lease Agreement** mechanics model real-world data handling agreements, including terms, liabilities, and fee structures. Players must decide what data to accept, how to store it, and how to protect it -- directly paralleling enterprise data protection decisions.

---

### 2.6 Physical Security

#### 2.6.1 Threat Overview

Physical security is the often-overlooked foundation of cybersecurity. The most sophisticated encryption is worthless if an attacker can walk into your server room and plug in a USB device. Physical security intersects with cybersecurity at every access point, workstation, server rack, and conference room.

#### 2.6.2 Sub-Categories

**Clean Desk Policy**

- Requiring employees to clear their desks of sensitive documents and lock their screens when leaving their workstations.
- Prevents visual eavesdropping ("shoulder surfing"), unauthorized document access, and photography of sensitive information.
- Particularly critical in open-plan offices, shared workspaces, and customer-facing environments.
- Must extend to whiteboards, sticky notes, and printed materials left in printers.

**Badge Security and Access Control**

- Physical access control systems (key cards, smart badges, biometrics) that restrict entry to authorized personnel.
- Badge cloning using commercially available RFID/NFC readers can be accomplished in seconds with physical proximity to a target badge.
- Visitor management systems must track all non-employee access and ensure escort requirements are enforced.
- Access logs must be reviewed regularly for anomalies: after-hours access, access to unusual areas, piggyback entries.

**USB Drops and Rogue Devices**

- Malicious USB devices left in public areas or mailed to targets, designed to exploit curiosity and install malware when plugged in.
- USB Rubber Ducky and similar tools can execute pre-programmed keystroke injection attacks in seconds.
- USB kill devices can physically destroy hardware by discharging electrical surges.
- Network implants disguised as USB chargers, power adapters, or Ethernet adapters can provide persistent remote access.
- In one study, **48% of people** who found USB drives in parking lots plugged them into their computers.

**Secure Disposal**

- Proper destruction of physical media containing sensitive data: hard drives, SSDs, USB drives, paper documents, optical media.
- Degaussing, physical shredding, and cryptographic erasure are standard methods.
- Improperly disposed equipment has led to significant data breaches, including the recovery of classified military information from hard drives sold on eBay.

**Surveillance and Monitoring**

- CCTV systems, motion sensors, and environmental monitoring (temperature, humidity, water detection) for data center and server room security.
- Physical intrusion detection systems complement logical access controls.
- Social engineering tests should include physical penetration testing: attempting to gain unauthorized building access.

#### 2.6.3 Training Content Requirements

| Skill Area         | Beginner                          | Intermediate                                            | Advanced                               |
| ------------------ | --------------------------------- | ------------------------------------------------------- | -------------------------------------- |
| Clean Desk         | Clear desk before leaving         | Lock screen, secure documents, no sticky note passwords | Implement clean desk audits            |
| Badge Security     | Never share badges                | Report lost/stolen badges immediately                   | Understand badge cloning risks         |
| USB Safety         | Never plug in unknown USB devices | Report found USB devices to security                    | Understand USB attack vectors          |
| Visitor Management | Escort all visitors               | Verify visitor identity independently                   | Conduct physical security assessments  |
| Secure Disposal    | Shred sensitive paper documents   | Use approved electronic media destruction               | Maintain chain-of-custody for disposal |

#### 2.6.4 In-Game Mapping

Physical security maps to the **Facility Status Report** and **Upgrade Loop** mechanics. Players manage rack space, power, and cooling -- the physical infrastructure of the data center. Physical security decisions are embedded in upgrade choices: investing in better physical security reduces certain attack vectors but consumes resources that could go to other defenses. The **clean desk analogy** maps to information discipline throughout the game: loose handling of applicant information can be exploited by adversaries.

---

### 2.7 Network Security

#### 2.7.1 Threat Overview

Network security encompasses the policies, practices, and technologies designed to protect the integrity, confidentiality, and availability of network infrastructure and the data traversing it. In the game's post-collapse world, where "only a few isolated networks still run," network security is literally existential.

#### 2.7.2 Sub-Categories

**Wi-Fi Security**

- Wireless networks are inherently more vulnerable than wired networks because signals can be intercepted by anyone within range.
- Evil twin attacks: attackers create fake Wi-Fi access points that mimic legitimate networks, intercepting all traffic from connected devices.
- WPA2 vulnerabilities (KRACK attack) and the slow adoption of WPA3 leave many networks exposed.
- Public Wi-Fi networks in airports, hotels, and coffee shops are high-risk environments for credential interception.
- Rogue access points installed within corporate premises can bypass network security controls entirely.

**VPN Usage**

- Virtual Private Networks create encrypted tunnels between devices and corporate networks, protecting data in transit.
- VPN vulnerabilities have been heavily exploited: critical CVEs in Fortinet, Pulse Secure, Citrix, and Ivanti VPN products have been among the most exploited vulnerabilities in 2024-2025.
- Split tunneling configurations can inadvertently expose corporate traffic through insecure personal networks.
- VPN credentials are high-value targets: compromised VPN access provides direct entry to corporate networks.
- Zero Trust Network Access (ZTNA) is increasingly replacing traditional VPN for remote access.

**Man-in-the-Middle (MITM) Attacks**

- Interception of communications between two parties who believe they are communicating directly with each other.
- ARP spoofing: attacker associates their MAC address with the IP address of a legitimate network device.
- DNS spoofing: redirecting DNS queries to malicious servers, sending users to fake versions of legitimate websites.
- SSL stripping: downgrading HTTPS connections to HTTP to intercept credentials in plaintext.
- BGP hijacking: redirecting internet traffic through attacker-controlled networks at the routing level.

**Network Segmentation**

- Dividing networks into isolated segments to contain breaches and limit lateral movement.
- Microsegmentation applies fine-grained access controls within data center and cloud environments.
- Failure to segment networks is consistently cited as a factor that increases breach severity and dwell time.

**Firewall and Intrusion Detection/Prevention**

- Firewalls filter network traffic based on rules; IDS/IPS systems monitor for and respond to malicious activity.
- Next-generation firewalls (NGFW) incorporate application awareness, deep packet inspection, and threat intelligence.
- The shift to cloud and remote work has expanded the network perimeter beyond traditional firewall boundaries.

#### 2.7.3 Training Content Requirements

| Skill Area        | Beginner                                | Intermediate                                  | Advanced                                   |
| ----------------- | --------------------------------------- | --------------------------------------------- | ------------------------------------------ |
| Wi-Fi Hygiene     | Avoid public Wi-Fi for sensitive tasks  | Verify network authenticity before connecting | Detect evil twin and rogue access points   |
| VPN Discipline    | Always use VPN on untrusted networks    | Understand split tunneling risks              | Configure and verify VPN security settings |
| MITM Awareness    | Look for HTTPS padlock icon             | Recognize certificate warnings                | Understand SSL/TLS interception techniques |
| Network Awareness | Recognize unusual network behavior      | Report suspicious network activity            | Perform basic network traffic analysis     |
| Segmentation      | Understand why different networks exist | Comply with network access policies           | Design network segmentation architectures  |

#### 2.7.4 In-Game Mapping

Network security is the very architecture of "The DMZ: Archive Gate." The game world exists within "a few isolated networks," and the player's data center operates within a DMZ -- a demilitarized zone between trusted and untrusted networks. The game's name itself is a network security concept. Network capacity is a managed resource: bandwidth is limited, each accepted client increases attack surface, and upgrades to network infrastructure directly model real-world network security investments.

---

### 2.8 Cloud Security

#### 2.8.1 Threat Overview

Cloud adoption has fundamentally transformed the attack surface. Organizations now store critical data and run essential workloads across multiple cloud providers, SaaS platforms, and hybrid environments. The Cloud Security Alliance's 2025-2026 State of SaaS Security report highlights that organizations face rising tides of visibility gaps, shadow IT, over-privileged access, and unchecked third-party integrations.

#### 2.8.2 Sub-Categories

**Shadow IT**

- Employees deploying cloud services, applications, and infrastructure without IT security approval or oversight.
- **55% of employees** adopt SaaS applications without security team involvement.
- Shadow IT assets lack security controls, compliance monitoring, and proper access management.
- Common shadow IT: personal cloud storage (Dropbox, Google Drive), project management tools, AI/ML services, code repositories.
- Shadow assets and abandoned infrastructure are becoming **more dangerous than active systems** because they are forgotten but still accessible.

**SaaS Misconfiguration**

- Incorrectly configured security settings in cloud-hosted Software-as-a-Service platforms.
- Misconfigurations remain the **number one cloud security threat**: public buckets, permissive IAM roles, and unencrypted data continue to expose organizations.
- Common misconfigurations: overly permissive sharing settings, disabled audit logging, failure to enforce MFA, excessive API permissions.
- In many notable 2025 incidents, attackers needed no sophisticated tools -- they simply found what enterprises had left exposed.

**Cloud Storage Leaks**

- Sensitive data exposed through misconfigured cloud storage (S3 buckets, Azure Blob Storage, GCS buckets).
- **63% of organizations** report external data oversharing as a significant concern.
- Automated scanning tools continuously crawl the internet for exposed cloud storage instances.
- Even temporary misconfigurations can result in data exposure, as automated crawlers may index content within hours.

**Identity and Access Management (IAM) Failures**

- Overly permissive IAM policies that grant users more access than necessary (violation of least privilege).
- Service account keys and API tokens left in code repositories, configuration files, or documentation.
- OAuth integration exploitation: the SalesLoft/Salesforce supply chain attack in 2025 exploited OAuth integrations to gain access to customer environments at scale, affecting TransUnion and exposing **4.46 million consumer records**.

**Container and Serverless Security**

- Vulnerabilities in container images, Kubernetes misconfigurations, and serverless function security gaps.
- Publicly exposed Kubernetes dashboards and Docker registries remain common.
- Supply chain attacks through compromised base images and dependencies.

#### 2.8.3 Training Content Requirements

| Skill Area            | Beginner                                      | Intermediate                                | Advanced                                    |
| --------------------- | --------------------------------------------- | ------------------------------------------- | ------------------------------------------- |
| Shadow IT Awareness   | Use only approved applications                | Report unauthorized tools and services      | Conduct shadow IT discovery and assessment  |
| Cloud Configuration   | Follow organization's cloud usage policies    | Review and validate security settings       | Implement cloud security posture management |
| Data Storage          | Store data only in approved locations         | Understand cloud storage access controls    | Design cloud data governance frameworks     |
| IAM Hygiene           | Use unique credentials for each cloud service | Review and minimize access permissions      | Implement least-privilege IAM policies      |
| Shared Responsibility | Understand that cloud security is shared      | Know which controls are your responsibility | Design security architectures for cloud     |

#### 2.8.4 In-Game Mapping

Cloud security maps to the **resource management** and **capacity planning** aspects of "The DMZ: Archive Gate." The data center's rack space, bandwidth, and power are analogous to cloud resources -- finite, expandable through investment, but each expansion introduces new security considerations. The **Upgrade Proposal** mechanic models the trade-off between capacity and security that cloud adoption always entails.

---

### 2.9 Supply Chain Attacks

#### 2.9.1 Threat Overview

Supply chain attacks exploit trusted relationships between organizations and their vendors, partners, and software providers. Rather than attacking a hardened target directly, adversaries compromise a less-secure vendor or software component that the target depends upon. The 2025-2026 landscape has seen supply chain attacks evolve from opportunistic exploitation to **deliberate, strategic targeting** of vendors that serve multiple high-value organizations.

Cyble recorded **6,604 ransomware attacks** in 2025, up 52% from 2024, with many originating through supply chain vectors. A study by Panorays found that **85% of CISOs still lack complete visibility** into their overall threat landscape, and while 60% report rising third-party breaches, only **41% monitor risk beyond direct suppliers**.

#### 2.9.2 Sub-Categories

**Third-Party Risk**

- Vendors, contractors, partners, and service providers who have access to your data, networks, or systems.
- Third-party breaches have cascading effects: the Jaguar Land Rover attack in August 2025 cost an estimated **1.9 billion pounds**, halted production for five weeks, and affected more than **5,000 businesses** across JLR's global supply chain.
- Attackers specifically research which vendors serve multiple high-value targets, then deliberately compromise those vendors as **force multipliers**.
- Vendor security assessments are typically conducted annually, but attackers can compromise a vendor at any time between assessments.
- Third-party risk management must become **continuous, not annual**: real-time security posture monitoring, dark web monitoring for compromised vendor credentials, and comprehensive Software Bills of Materials (SBOM).

**Software Supply Chain**

- Compromised software updates, poisoned dependencies, malicious packages in public repositories.
- The SolarWinds SUNBURST attack (2020) remains the watershed event, but supply chain attacks have continued to escalate.
- Package repository attacks: typosquatting (uploading malicious packages with names similar to popular packages), dependency confusion (exploiting how package managers resolve internal vs. public dependencies), and compromised maintainer accounts.
- Open-source dependency chains can be extraordinarily deep: a single application may depend on thousands of libraries, each maintained by different individuals or organizations.
- SBOM (Software Bill of Materials) adoption is increasing but still insufficient: only **15% of CISOs** report full visibility into their software supply chains, up from just 3% a year ago.

**Hardware Supply Chain**

- Compromised hardware components, firmware backdoors, and counterfeit equipment.
- Supply chain integrity for network equipment, servers, and IoT devices is difficult to verify.
- Nation-state actors have been documented tampering with hardware during shipping and manufacturing.

**Managed Service Provider (MSP) Compromise**

- Attackers target MSPs to gain access to the MSP's entire customer base simultaneously.
- MSPs have privileged access to client networks for remote management and monitoring.
- A single compromised MSP can provide access to hundreds or thousands of downstream organizations.

#### 2.9.3 Training Content Requirements

| Skill Area         | Beginner                                       | Intermediate                                      | Advanced                                  |
| ------------------ | ---------------------------------------------- | ------------------------------------------------- | ----------------------------------------- |
| Vendor Awareness   | Understand that vendors can be attack vectors  | Evaluate vendor security posture                  | Conduct third-party risk assessments      |
| Software Integrity | Install only from trusted sources              | Verify software signatures and checksums          | Implement SBOM and dependency scanning    |
| Update Hygiene     | Apply patches promptly                         | Understand the risk/benefit of immediate patching | Test patches in staging before production |
| Contract Security  | Recognize security clauses in vendor contracts | Negotiate security requirements with vendors      | Design vendor security programs           |
| Incident Response  | Report suspected vendor compromises            | Participate in vendor incident response           | Coordinate multi-party incident response  |

#### 2.9.4 In-Game Mapping

Supply chain attacks are an **explicit primary threat** in "The DMZ: Archive Gate." The story document states: "Supply chain malware hidden in backups" is one of the game's primary threats. When players accept data from applicants, they are accepting potential supply chain risk. The **Data Salvage Contract** mechanics model vendor agreements, and the **Threat Assessment Sheet** trains players to evaluate the risk score of incoming data -- directly paralleling software supply chain security analysis.

---

### 2.10 Insider Threats

#### 2.10.1 Threat Overview

Insider threats originate from individuals who have legitimate access to organizational systems and data: employees, contractors, business partners, and former employees whose access has not been properly revoked. The Ponemon Institute recorded **7,868 insider incidents** in its 2025 study, more than double the 3,269 incidents examined in 2018. The share of organizations experiencing insider attacks has risen from 66% in 2019 to **76% in 2024**. Insider threats cost organizations an average of **$17.4 million annually**, with credential theft averaging **$779,000 per incident**.

#### 2.10.2 Sub-Categories

**Accidental Insiders (Negligent)**

- Employees who cause security incidents through carelessness, ignorance, or error rather than malicious intent.
- Non-malicious insiders account for **75% of all insider incidents**: negligent employees cause 55% and external exploitation of employees causes another 20%.
- Common accidental insider actions: sending emails to the wrong recipient, misconfiguring security settings, falling for phishing attacks, losing devices, using weak passwords, uploading sensitive data to unauthorized cloud services.
- Accidental insiders are the most common but typically the least costly per incident because they are usually detected faster and cause less targeted damage.

**Malicious Insiders**

- Employees or contractors who intentionally abuse their legitimate access for personal gain, revenge, ideology, or espionage.
- Malicious insiders account for **25% of incidents** but carry the highest financial impact at **$4.92 million per breach** on average.
- Motivations include: financial gain (selling data, committing fraud), disgruntlement (revenge for perceived mistreatment), ideology (whistleblowing, hacktivism), and espionage (nation-state recruitment).
- Flashpoint observed **91,321 instances** of insider recruiting, advertising, and threat actor discussions involving insider-related illicit activity in 2025.
- The telecommunications industry is the primary target for insider recruitment due to its role in identity verification and SIM swapping.

**Compromised Insiders**

- Legitimate users whose credentials or devices have been taken over by external attackers.
- Stolen credentials were used in **22% of all breaches** -- a hybrid attack that breaks through traditional defenses because the attacker operates under the guise of a trusted, legitimate user.
- Compromised insiders are created through phishing, malware, credential stuffing, or social engineering.
- Detection is particularly difficult because the compromised user's actions appear legitimate from a behavioral standpoint until the attacker deviates from normal patterns.

**Third-Party Insiders**

- Vendors, contractors, and partners who have legitimate access to organizational systems.
- Often have less security training and oversight than full-time employees.
- May have broad access that persists long after business relationships end.
- **93% of security leaders** say insider threats are as difficult or harder to detect than external attacks, yet only **23%** express strong confidence in stopping them before serious damage occurs.

#### 2.10.3 Training Content Requirements

| Skill Area             | Beginner                                        | Intermediate                                               | Advanced                              |
| ---------------------- | ----------------------------------------------- | ---------------------------------------------------------- | ------------------------------------- |
| Self-Awareness         | Recognize that you can be an accidental insider | Understand how your actions affect organizational security | Model secure behavior for others      |
| Anomaly Recognition    | Report unusual colleague behavior               | Identify indicators of insider compromise                  | Implement behavioral analytics        |
| Access Discipline      | Use only the access you need                    | Report excessive permissions                               | Implement and enforce least privilege |
| Reporting Culture      | Know how to report concerns                     | Report without fear of retaliation                         | Foster a speak-up security culture    |
| Off-boarding Awareness | Return all equipment and credentials            | Ensure access revocation is complete                       | Conduct off-boarding security audits  |

#### 2.10.4 In-Game Mapping

Insider threats are deeply embedded in "The DMZ: Archive Gate" through the core tension between access and security. Every access approval creates a potential insider: a client who gains access to the data center's systems could be legitimate or could be a threat actor who has passed verification. The game's escalating sophistication mechanic -- "adversaries become more sophisticated as we scale up" -- models the reality that growth creates more insider threat surface. The **Blacklist Notice** and **Whitelist Exception** mechanics directly model the organizational decisions around trust management and insider risk.

---

### 2.11 AI-Powered Threats

#### 2.11.1 Threat Overview

Artificial intelligence has fundamentally altered the balance of power in cybersecurity. While AI enables powerful defensive capabilities, it has also supercharged offensive operations. Experian's 2026 threat predictions place AI as the central threat to cybersecurity, with the potential to increase attack tempo by **10x to 100x**. More than **80% of cyberattacks** now involve AI in some capacity, whether for reconnaissance, social engineering, malware generation, or evasion.

#### 2.11.2 Sub-Categories

**Deepfakes (Video and Image)**

- AI-generated synthetic media that realistically depicts people saying or doing things they never did.
- Deepfakes now comprise **6.5% of all fraud attacks**, representing a **2,137% rise** between 2022 and 2025.
- AI-powered deepfakes were involved in over **30% of high-impact corporate impersonation attacks** in 2025.
- Human detection rates for high-quality video deepfakes are only **24.5%** -- meaning three out of four people cannot reliably identify synthetic video.
- Gartner predicts that by 2026, **30% of enterprises** will no longer consider standalone identity verification and authentication solutions to be reliable in isolation.
- Deepfake-as-a-Service (DFaaS) platforms became widely available in 2025, making deepfake technology accessible to cybercriminals of all skill levels.

**AI-Generated Phishing**

- Large language models (LLMs) used to create convincing, grammatically perfect, contextually relevant phishing emails at scale.
- **82.6%** of phishing emails analyzed between September 2024 and February 2025 contained AI-generated content.
- AI-generated phishing emails achieve a **54% click-through rate** compared to 12% for human-written phishing -- a 4.5x improvement.
- AI eliminates the traditional tell-tales of phishing: grammatical errors, awkward phrasing, and cultural mismatches.
- Generative AI enables attackers to produce **thousands of unique, personalized phishing emails** per hour, each tailored to the specific target based on scraped social media, corporate information, and previous correspondence.

**Voice Cloning**

- AI technology that replicates a person's voice from audio samples.
- A voice can be cloned from as little as **60 seconds of audio**, and scammers need as little as **3 seconds** of audio to create an **85% voice match**.
- One in 10 people report having received a cloned voice message, and **77%** of these people lost money.
- Searches for "free voice cloning software" rose **120%** between July 2023 and 2024.
- Voice cloning is used for CEO fraud (impersonating executives to authorize wire transfers), family emergency scams, and bypassing voice-based authentication systems.

**AI-Assisted Reconnaissance**

- AI tools that automate the collection and analysis of open-source intelligence (OSINT) about targets.
- Automated scraping and correlation of social media, corporate directories, public records, and previous breach data.
- AI can identify optimal attack vectors by analyzing an organization's technology stack, employee behavior patterns, and security posture.

**Adversarial AI / AI Model Attacks**

- Attacks that target AI systems themselves: data poisoning (corrupting training data), model inversion (extracting training data from models), prompt injection (manipulating AI chatbots), and evasion attacks (crafting inputs that fool AI classifiers).
- As organizations deploy more AI-based security tools, attacks against those AI systems become a meta-threat.

**Autonomous Malware**

- Malware that uses AI to make real-time decisions about propagation, evasion, and payload deployment.
- AI-powered malware can adapt to the specific defenses it encounters, changing its behavior to avoid detection.
- While still primarily theoretical or proof-of-concept, autonomous malware is expected to become a significant operational threat by 2026-2027.

#### 2.11.3 Training Content Requirements

| Skill Area              | Beginner                                    | Intermediate                                                | Advanced                                                    |
| ----------------------- | ------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------- |
| Deepfake Awareness      | Know that deepfakes exist                   | Identify common deepfake artifacts (glitches, lighting)     | Use detection tools and verify through independent channels |
| AI Phishing Recognition | Understand that AI can write perfect emails | Analyze email context and sender behavior, not just grammar | Detect AI-generated patterns and anomalies                  |
| Voice Verification      | Be suspicious of unexpected voice calls     | Establish verbal code words for high-stakes transactions    | Implement multi-factor voice verification                   |
| AI Literacy             | Understand basic AI capabilities            | Recognize AI-generated content across modalities            | Evaluate AI tool risks and implement governance             |
| Critical Thinking       | Question extraordinary claims               | Verify through multiple independent sources                 | Maintain skepticism even when evidence appears overwhelming |

#### 2.11.4 In-Game Mapping

AI-powered threats represent the **escalating sophistication** mechanic in "The DMZ: Archive Gate." As players upgrade their data center and accept more clients, adversaries become more sophisticated -- a progression that mirrors the real-world adoption of AI by threat actors. Late-game phishing attempts may use AI-generated pretexts that are significantly harder to detect than early-game attempts. The **Intelligence Brief** document serves as the in-game equivalent of threat intelligence about emerging AI-powered attack techniques.

---

### 2.12 IoT Security

#### 2.12.1 Threat Overview

The Internet of Things encompasses billions of connected devices -- from industrial control systems and medical equipment to smart thermostats and security cameras. These devices dramatically expand the attack surface and often lack the security capabilities of traditional computing platforms. IoT attacks have reached **820,000 daily attacks**, with IoMT (Internet of Medical Things) breach costs averaging **$10 million**.

#### 2.12.2 Sub-Categories

**Smart Device Risks**

- IoT devices often run stripped-down operating systems with limited security capabilities.
- **60% of IoT breaches** come from unpatched firmware and outdated software.
- Devices may lack the ability to receive security updates, or manufacturers may discontinue support, leaving known vulnerabilities permanently unpatched.
- **75% of connected medical devices** run outdated operating systems, leading to dangerous service outages averaging **6.5 hours**.
- Smart building systems (HVAC, lighting, elevators) connected to corporate networks can provide lateral movement paths for attackers.
- Consumer IoT devices (smart speakers, cameras, doorbells) can be used for surveillance, network penetration, or as botnet nodes.

**Default Credentials**

- One in five IoT devices still uses **default passwords**, making them trivially easy to compromise.
- Over **50% of devices** harbor critical security flaws.
- Default credentials for hundreds of thousands of device models are publicly documented in searchable databases.
- CISA has issued specific warnings about threat actors targeting UPSs (Uninterruptible Power Supplies) with default credentials, enabling attackers to disrupt critical infrastructure.
- The Mirai botnet (2016) and its ongoing variants demonstrate the devastating potential of default credential exploitation: building massive botnets from compromised IoT devices for DDoS attacks.
- Approximately **35% of global DDoS attacks** originate from IoT botnets built through default credential exploitation.

**Industrial IoT (IIoT) and OT Security**

- Industrial control systems (ICS) and operational technology (OT) environments are increasingly connected to IT networks.
- **2,451 ICS vulnerability disclosures** were made across 152 vendors in 2025, nearly double the 2024 numbers.
- Attacks on ICS/OT can cause physical harm: manipulating industrial processes, disrupting power grids, contaminating water supplies.
- The convergence of IT and OT networks creates new attack paths that neither IT security teams nor OT engineers may fully understand.

**IoT Botnets**

- Networks of compromised IoT devices controlled by attackers for distributed denial-of-service (DDoS) attacks, spam distribution, and credential stuffing.
- New variants like the 2024 "Matrix" campaign continue to weaponize default and hardcoded credentials.
- IoT botnets can generate attack traffic exceeding **1 Tbps**, sufficient to overwhelm most organizations' defenses.

#### 2.12.3 Training Content Requirements

| Skill Area           | Beginner                                    | Intermediate                                      | Advanced                                          |
| -------------------- | ------------------------------------------- | ------------------------------------------------- | ------------------------------------------------- |
| Device Hygiene       | Change default passwords on all devices     | Regularly update device firmware                  | Implement IoT device management platforms         |
| Network Isolation    | Connect IoT devices to separate networks    | Understand IoT-specific network segmentation      | Design IoT security architectures                 |
| Inventory Management | Know what devices are on the network        | Maintain an IoT asset inventory                   | Implement continuous IoT discovery and monitoring |
| Procurement Security | Choose devices from reputable manufacturers | Evaluate device security features before purchase | Develop IoT security procurement standards        |
| Incident Response    | Report unusual device behavior              | Isolate compromised IoT devices                   | Conduct IoT-specific forensic analysis            |

#### 2.12.4 In-Game Mapping

IoT security maps to the **Facility Status Report** and infrastructure management mechanics. The data center's power, cooling, and utilization monitoring systems are IoT devices in themselves. Upgrades to the facility may introduce new connected systems (better cooling, automated monitoring, smart power management) that expand the attack surface -- mirroring the real-world IoT security trade-off between operational efficiency and security risk. The game's mechanic that "every upgrade triggers new threat vectors" is fundamentally an IoT security principle.

---

## 3. Behavioral Change Objectives

### 3.1 The Behavioral Change Framework

Cybersecurity awareness training fails when it treats knowledge as the end goal. Knowing that phishing exists does not prevent someone from clicking a phishing link. The objective is **behavioral change** -- measurable, sustained modifications to how people act in security-relevant situations.

"The DMZ: Archive Gate" achieves this through **experiential learning**: players do not read about phishing -- they receive phishing emails. They do not study access control -- they make access decisions. They do not learn about ransomware in a slideshow -- they face ransom notes and lose real in-game progress.

### 3.2 Target Behaviors and Measurable Outcomes

#### 3.2.1 Verification Before Trust

**Target Behavior:** When receiving any request (email, phone, in-person, digital), the individual pauses and independently verifies the identity and authority of the requester before taking action.

| Metric                                                       | Baseline (Pre-Training) | Target (Post-Training)           | Measurement Method                 |
| ------------------------------------------------------------ | ----------------------- | -------------------------------- | ---------------------------------- |
| Phishing simulation click rate                               | 25-35%                  | <5%                              | Simulated phishing campaigns       |
| Time to report suspicious email                              | >24 hours               | <15 minutes                      | Email reporting analytics          |
| Percentage of requests verified independently                | <20%                    | >80%                             | Behavioral observation and surveys |
| False negative rate (failing to detect phishing)             | 40-60%                  | <10%                             | Game scenario performance tracking |
| False positive rate (reporting legitimate email as phishing) | 5-10%                   | <15% (acceptable over-reporting) | Reporting analytics                |

**In-Game Measurement:** Players who accept fraudulent access requests without full verification lose resources. The game tracks approval accuracy rate, verification thoroughness (how many verification steps were completed before decision), and time-to-decision patterns.

#### 3.2.2 Least Privilege Mindset

**Target Behavior:** Individuals request, grant, and maintain only the minimum access necessary for the task at hand, and promptly revoke access when it is no longer needed.

| Metric                            | Baseline         | Target          | Measurement Method       |
| --------------------------------- | ---------------- | --------------- | ------------------------ |
| Excessive permission requests     | Common           | Rare            | Access request analytics |
| Time to revoke unnecessary access | Months/Never     | Within 24 hours | IAM audit logs           |
| Shared account usage              | >30% of accounts | <2% of accounts | Authentication analytics |
| Orphaned account discovery rate   | High             | Low             | Periodic access reviews  |

**In-Game Measurement:** Players manage limited rack space and bandwidth. Over-provisioning (accepting too many clients) increases attack surface and can lead to breaches. The game rewards conservative, justified access decisions and penalizes over-extension.

#### 3.2.3 Secure Communication Habits

**Target Behavior:** Individuals use appropriate channels and encryption for sensitive communications, verify recipient identity before sharing sensitive information, and avoid discussing confidential matters in insecure contexts.

| Metric                                       | Baseline | Target            | Measurement Method                |
| -------------------------------------------- | -------- | ----------------- | --------------------------------- |
| Sensitive data sent via unencrypted channels | >40%     | <5%               | DLP monitoring                    |
| Email sent to wrong recipient incidents      | Monthly  | Quarterly or less | Incident reporting                |
| Use of approved file-sharing services        | <50%     | >95%              | Cloud access security broker logs |
| Confidential discussions in public areas     | Common   | Rare              | Physical security observation     |

**In-Game Measurement:** Players communicate with applicants via email. Mishandling of applicant information, sharing verification details in insecure ways, or failing to compartmentalize information creates vulnerability. The game tracks information handling discipline throughout the interaction lifecycle.

#### 3.2.4 Prompt Incident Reporting

**Target Behavior:** When individuals observe, suspect, or experience a security incident, they report it immediately through the correct channels without attempting to investigate or resolve it independently.

| Metric                                | Baseline                  | Target                                   | Measurement Method                    |
| ------------------------------------- | ------------------------- | ---------------------------------------- | ------------------------------------- |
| Mean time to report incidents         | >72 hours                 | <1 hour                                  | Incident management system            |
| Percentage of incidents self-reported | <30%                      | >70%                                     | Incident reports vs. detection alerts |
| False alarm tolerance                 | Low (fear of crying wolf) | High (encouraged reporting)              | Reporting volume trends               |
| Incident report quality               | Incomplete                | Actionable (who, what, when, where, how) | Report review                         |

**In-Game Measurement:** The **Incident Log** mechanic tracks the player's response time and accuracy when attacks occur. Fast, accurate reporting (identifying the attack type, affected systems, and recommended action) improves outcomes. Delayed or inaccurate reporting leads to greater damage.

#### 3.2.5 Skepticism Under Pressure

**Target Behavior:** Individuals maintain analytical skepticism when facing urgent, emotional, or authoritative requests, resisting the natural human tendency to comply without verification.

| Metric                                     | Baseline | Target        | Measurement Method              |
| ------------------------------------------ | -------- | ------------- | ------------------------------- |
| Compliance with urgent unverified requests | >60%     | <10%          | Social engineering simulations  |
| Resistance to authority-based manipulation | Low      | High          | Simulated whaling/BEC attacks   |
| Decision quality under time pressure       | Degraded | Maintained    | Timed scenario performance      |
| Emotional manipulation resistance          | Low      | Moderate-High | Social engineering test results |

**In-Game Measurement:** "The DMZ: Archive Gate" places players under constant time and resource pressure. Requests arrive with urgent narratives ("our university's entire research archive will be lost"), emotional manipulation ("children's hospital records"), and authority claims ("government mandate for emergency access"). The game directly measures whether players maintain verification discipline under these pressures.

#### 3.2.6 Security-First Decision Making

**Target Behavior:** When making decisions that involve trade-offs between convenience/speed and security, individuals consistently choose the more secure option unless explicitly authorized to accept the risk.

| Metric                   | Baseline         | Target                        | Measurement Method        |
| ------------------------ | ---------------- | ----------------------------- | ------------------------- |
| Shadow IT adoption       | 55% of employees | <10%                          | Cloud access monitoring   |
| Password reuse rate      | 94%              | <10%                          | Password audit tools      |
| MFA adoption rate        | Variable         | >99% for all critical systems | Authentication analytics  |
| Security bypass requests | Common           | Rare and documented           | Policy exception tracking |

**In-Game Measurement:** Every decision in the game is a security-first decision. Accepting a high-paying client increases revenue but also increases attack surface. Skipping verification to process more requests faster saves time but increases breach probability. The game's economic model makes the security trade-off visceral and immediate.

### 3.3 Behavioral Persistence and Decay

Training-induced behavioral change naturally decays over time. Research indicates that without reinforcement, security awareness degrades to pre-training levels within **3-6 months**. "The DMZ: Archive Gate" addresses this through:

- **Continuous engagement:** Unlike annual compliance training, the game can be played regularly, providing ongoing reinforcement.
- **Spaced repetition:** Core concepts appear repeatedly in different contexts, strengthening long-term retention.
- **Consequence feedback:** Every decision produces visible consequences (positive or negative), creating strong associative learning.
- **Difficulty escalation:** As players improve, the game becomes harder, preventing complacency.
- **Social reinforcement:** Leaderboards and team challenges create peer pressure for maintaining security-conscious behavior.

---

## 4. Threat Intelligence Integration

### 4.1 The Intelligence Lifecycle

Keeping training content current with the evolving threat landscape requires a structured intelligence lifecycle that feeds real-world threat data into game scenarios, difficulty parameters, and content updates.

```
+-------------------+     +-------------------+     +-------------------+
|                   |     |                   |     |                   |
|    COLLECTION     +---->+    PROCESSING     +---->+    ANALYSIS       |
|                   |     |                   |     |                   |
+-------------------+     +-------------------+     +---------+---------+
                                                              |
+-------------------+     +-------------------+               |
|                   |     |                   |               |
|    FEEDBACK       +<----+   DISSEMINATION   +<--------------+
|                   |     |                   |
+-------------------+     +-------------------+
```

### 4.2 Threat Feed Integration

#### 4.2.1 Primary Intelligence Sources

| Source Category              | Examples                                                                        | Integration Method                         | Update Frequency |
| ---------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------ | ---------------- |
| **Government Advisories**    | CISA Alerts, ENISA Reports, NCSC Advisories                                     | Automated RSS/API ingestion                | As published     |
| **Vendor Threat Reports**    | CrowdStrike Global Threat Report, Mandiant M-Trends, Sophos State of Ransomware | Manual analysis + scenario generation      | Quarterly        |
| **ISAC/ISAO Feeds**          | FS-ISAC, Health-ISAC, IT-ISAC                                                   | Sector-specific threat alerts              | Daily            |
| **Open-Source Intelligence** | AlienVault OTX, Abuse.ch, PhishTank                                             | Automated IOC feed ingestion               | Real-time        |
| **Dark Web Monitoring**      | Recorded Future, Flashpoint, DarkOwl                                            | Emerging threat alerts                     | Daily            |
| **Vulnerability Databases**  | NVD, CVE, Exploit-DB                                                            | Vulnerability-to-scenario mapping          | As published     |
| **Academic Research**        | ArXiv, IEEE, ACM                                                                | Novel attack technique analysis            | Monthly          |
| **Industry Reports**         | WEF Global Cybersecurity Outlook, Verizon DBIR, Ponemon                         | Trend analysis and scenario prioritization | Annual/Quarterly |

#### 4.2.2 Feed Processing Pipeline

```
Raw Threat Data
       |
       v
+------+-------+
| Normalization |  (Standardize formats: STIX/TAXII)
+------+-------+
       |
       v
+------+-------+
| Deduplication |  (Remove duplicate indicators)
+------+-------+
       |
       v
+------+-------+
|  Enrichment   |  (Add context: actor attribution, severity, sector relevance)
+------+-------+
       |
       v
+------+-------+
| Prioritization|  (Rank by relevance to training objectives)
+------+-------+
       |
       v
+------+-------+
|  Scenario     |  (Transform intelligence into game scenarios)
|  Generation   |
+--------------+
```

### 4.3 MITRE ATT&CK Mapping

The MITRE ATT&CK framework provides a common language for structuring, comparing, and analyzing threat intelligence. Every game scenario in "The DMZ: Archive Gate" should map to specific ATT&CK techniques, enabling precise measurement of which techniques players can detect and respond to.

#### 4.3.1 Relevant ATT&CK Tactics and Technique Coverage

**Reconnaissance (TA0043)**

| Technique                          | ID    | Game Scenario                                                                                   |
| ---------------------------------- | ----- | ----------------------------------------------------------------------------------------------- |
| Gather Victim Identity Information | T1589 | Adversaries research the data center's clients and operations before crafting targeted requests |
| Search Open Websites/Domains       | T1593 | Attackers reference publicly known information about the data center to build credibility       |
| Phishing for Information           | T1598 | Pre-attack emails designed to extract information about security procedures                     |

**Initial Access (TA0001)**

| Technique                           | ID        | Game Scenario                                                   |
| ----------------------------------- | --------- | --------------------------------------------------------------- |
| Phishing                            | T1566     | Fraudulent access requests via email (core game mechanic)       |
| Phishing: Spearphishing Attachment  | T1566.001 | Verification documents containing embedded malware              |
| Phishing: Spearphishing Link        | T1566.002 | Links in access requests leading to malicious sites             |
| Phishing: Spearphishing via Service | T1566.003 | Requests arriving through non-standard channels                 |
| Supply Chain Compromise             | T1195     | Malware hidden in client data backups                           |
| Valid Accounts                      | T1078     | Compromised client credentials used for unauthorized access     |
| Trusted Relationship                | T1199     | Exploiting existing client relationships to bypass verification |

**Execution (TA0002)**

| Technique                         | ID        | Game Scenario                                                |
| --------------------------------- | --------- | ------------------------------------------------------------ |
| User Execution: Malicious File    | T1204.002 | Players opening/accepting contaminated data payloads         |
| Command and Scripting Interpreter | T1059     | Malware in accepted backups executing on data center systems |

**Persistence (TA0003)**

| Technique            | ID    | Game Scenario                                                              |
| -------------------- | ----- | -------------------------------------------------------------------------- |
| Account Manipulation | T1098 | Approved clients attempting to expand their access beyond contracted terms |
| Create Account       | T1136 | Attackers creating new identities after being blacklisted                  |

**Privilege Escalation (TA0004)**

| Technique                         | ID    | Game Scenario                                            |
| --------------------------------- | ----- | -------------------------------------------------------- |
| Valid Accounts                    | T1078 | Legitimate accounts being used for unauthorized purposes |
| Abuse Elevation Control Mechanism | T1548 | Clients attempting to access other clients' data         |

**Defense Evasion (TA0005)**

| Technique         | ID    | Game Scenario                                                                |
| ----------------- | ----- | ---------------------------------------------------------------------------- |
| Masquerading      | T1036 | Fake identities mimicking legitimate organizations                           |
| Impersonation     | T1656 | Attackers impersonating known-good entities                                  |
| Indicator Removal | T1070 | Adversaries learning from failed attempts and removing detectable indicators |

**Credential Access (TA0006)**

| Technique                      | ID    | Game Scenario                                         |
| ------------------------------ | ----- | ----------------------------------------------------- |
| Brute Force                    | T1110 | Automated attacks against data center authentication  |
| Phishing                       | T1566 | Social engineering to extract operational credentials |
| Steal Application Access Token | T1528 | Compromising access tokens or verification codes      |

**Collection (TA0009)**

| Technique                          | ID    | Game Scenario                                                  |
| ---------------------------------- | ----- | -------------------------------------------------------------- |
| Data from Information Repositories | T1213 | Attackers gaining access to stored client data                 |
| Email Collection                   | T1114 | Compromising communication between the data center and clients |

**Impact (TA0040)**

| Technique                 | ID    | Game Scenario                                              |
| ------------------------- | ----- | ---------------------------------------------------------- |
| Data Encrypted for Impact | T1486 | Ransomware encrypting the data center (breach consequence) |
| Data Destruction          | T1485 | Attackers attempting to destroy client data                |
| Service Stop              | T1489 | Attacks disrupting data center operations                  |
| Financial Theft           | T1657 | Ransom demands (total earnings / 10)                       |

#### 4.3.2 ATT&CK Navigator Heat Map Integration

Game analytics should generate ATT&CK Navigator-compatible heat maps showing:

- **Coverage:** Which techniques are covered by existing game scenarios.
- **Player Performance:** Which techniques players can detect vs. which consistently bypass them.
- **Training Gaps:** Techniques that exist in the real-world landscape but are not yet covered by game scenarios.
- **Trend Alignment:** Whether training emphasis matches the frequency and severity of real-world technique usage.

### 4.4 Threat Intelligence to Scenario Translation

The process of converting raw threat intelligence into playable game scenarios follows a structured translation pipeline:

#### Step 1: Threat Assessment

When a new threat emerges (e.g., a novel phishing technique, a new ransomware variant), assess its relevance:

- **Prevalence:** How widespread is this technique?
- **Impact:** What is the potential damage?
- **Human Factor:** Does this technique exploit human behavior (trainable) or purely technical vulnerabilities (not trainable through awareness)?
- **Timeliness:** How urgent is it to add this to training?

#### Step 2: Scenario Design

Translate the threat into a game scenario:

- **Narrative:** Create an in-game pretext that realistically delivers the threat (e.g., a new client whose access request mimics a real-world phishing campaign pattern).
- **Red Flags:** Embed detectable indicators based on the real-world technique's TTPs.
- **Difficulty Calibration:** Set the difficulty level based on the technique's sophistication and the player's demonstrated skill.
- **Consequence Modeling:** Define the in-game impact of failing to detect the threat.

#### Step 3: Validation

Before deployment:

- **Subject Matter Expert Review:** Cybersecurity professionals verify that the scenario accurately represents the real-world technique.
- **Playtesting:** Verify that the scenario is neither too easy (everyone detects it) nor too hard (no one detects it) at the target difficulty level.
- **Learning Objective Alignment:** Confirm that the scenario teaches the intended behavioral lesson.

#### Step 4: Deployment and Feedback

After deployment:

- **Performance Monitoring:** Track detection rates, response times, and decision quality.
- **Difficulty Adjustment:** Tune difficulty based on player population performance data.
- **Retirement Criteria:** Scenarios are retired or updated when detection rates exceed 95% at the target difficulty level, or when the underlying real-world technique evolves.

### 4.5 Content Freshness Standards

| Content Type                | Review Cycle | Update Trigger                             | Retirement Criteria                        |
| --------------------------- | ------------ | ------------------------------------------ | ------------------------------------------ |
| Core phishing scenarios     | Monthly      | New phishing technique reported            | >95% detection rate sustained for 3 months |
| Social engineering pretexts | Bi-weekly    | New social engineering campaign documented | >90% detection rate sustained for 2 months |
| Malware indicators          | Weekly       | New malware variant or campaign            | Technique no longer in active use          |
| Threat actor profiles       | Monthly      | New attribution or campaign disclosure     | Actor group disbanded or dormant >6 months |
| Difficulty parameters       | Continuous   | Player population performance data         | N/A (continuously adaptive)                |
| Compliance content          | Quarterly    | Regulatory change                          | Regulation repealed or superseded          |

---

## 5. Difficulty Progression

### 5.1 Difficulty Framework Overview

"The DMZ: Archive Gate" implements a progressive difficulty system that scales training intensity based on player competence. This mirrors real-world threat evolution: as organizations improve their defenses, attackers adapt and become more sophisticated. The difficulty system operates across five tiers with adaptive modulation within each tier.

### 5.2 Tier Definitions

#### Tier 1: Green Zone (Beginner)

**Player Profile:** No prior cybersecurity awareness training. Cannot distinguish phishing from legitimate email. Does not understand basic security concepts.

**Threat Characteristics:**

- Obvious grammatical and spelling errors in fraudulent emails.
- Mismatched sender names and email addresses (e.g., email claims to be from "Berlin University" but sent from freemail address).
- Unrealistic urgency or too-good-to-be-true offers.
- Inconsistent details within the request (contradictory dates, impossible claims).
- No attempt to match organizational formatting or terminology.

**Game Parameters:**

- Low request volume (1-3 per game day).
- Long decision timers (no time pressure).
- Explicit verification hints ("This sender's domain does not match their claimed organization").
- Forgiving breach consequences (warnings before actual breaches).
- Tutorial tooltips and guided analysis workflows.

**Learning Objectives:**

- Understand the concept of email verification.
- Recognize blatant spoofing indicators.
- Complete a basic phishing analysis workflow.
- Understand the consequences of accepting unverified requests.

**Measurable Criteria for Advancement:** >80% detection rate on Tier 1 scenarios across 20+ decisions.

---

#### Tier 2: Yellow Zone (Intermediate-Low)

**Player Profile:** Understands basic phishing concepts. Can detect obvious fraudulent emails. Beginning to develop verification habits.

**Threat Characteristics:**

- Grammatically correct but stylistically inconsistent emails.
- Sender domain spoofing (similar but not exact domain names, e.g., uni-berlin.de vs. uni-berliin.de).
- Plausible but unverifiable claims that require cross-referencing.
- Emotional manipulation (sympathy-based pretexts, urgency without obvious artificiality).
- Mix of legitimate and fraudulent requests at roughly 60/40 ratio.

**Game Parameters:**

- Moderate request volume (3-5 per game day).
- Moderate decision timers.
- Partial verification hints (indicators without explicit explanations).
- Standard breach consequences.
- Verification tools available but must be actively used.

**Learning Objectives:**

- Analyze email domains and identify spoofing.
- Cross-reference claims against verification documents.
- Resist emotional manipulation in access requests.
- Manage competing priorities (revenue generation vs. security).

**Measurable Criteria for Advancement:** >75% detection rate on Tier 2 scenarios across 30+ decisions with <15% false positive rate.

---

#### Tier 3: Orange Zone (Intermediate-High)

**Player Profile:** Solid understanding of common phishing techniques. Consistent verification habits. Beginning to recognize advanced social engineering.

**Threat Characteristics:**

- Professionally crafted emails with accurate organizational branding and terminology.
- Legitimate-appearing domain names (registered domains mimicking real organizations).
- Multi-step social engineering (initial benign contact followed by escalating requests).
- Supply chain attack indicators embedded in data transfers.
- Insider threat scenarios (previously approved clients behaving suspiciously).
- Mix of legitimate and fraudulent requests at roughly 50/50 ratio.

**Game Parameters:**

- High request volume (5-8 per game day).
- Short decision timers (time pressure).
- No verification hints.
- Severe breach consequences (significant resource loss).
- Advanced verification tools require skill to interpret.
- Simultaneous incidents (handling a suspicious request while managing a facility alert).

**Learning Objectives:**

- Detect sophisticated spoofing techniques.
- Identify multi-stage social engineering campaigns.
- Recognize supply chain risk indicators.
- Manage multiple security priorities simultaneously.
- Make risk-based decisions under time pressure.

**Measurable Criteria for Advancement:** >70% detection rate on Tier 3 scenarios across 40+ decisions with <20% false positive rate and >85% incident response accuracy.

---

#### Tier 4: Red Zone (Advanced)

**Player Profile:** Strong security analyst skills. Consistent detection of sophisticated attacks. Effective under pressure. Beginning to anticipate adversary behavior.

**Threat Characteristics:**

- AI-generated pretexts with deep personalization based on in-game intelligence.
- Coordinated multi-vector attacks (simultaneous phishing, supply chain compromise, and insider activity).
- Long-game adversaries that establish trust over multiple interactions before attacking.
- Zero-day-style attacks (novel techniques not seen in previous game play).
- Adversary adaptation (enemies learn from previously failed attempts).
- Mix of legitimate and fraudulent requests at roughly 40/60 ratio.
- Deliberate false flag operations designed to trigger false positive responses.

**Game Parameters:**

- Very high request volume (8-12 per game day).
- Very short decision timers with concurrent tasks.
- Active adversary counter-intelligence (attackers attempt to identify the player's detection methods and circumvent them).
- Catastrophic breach consequences.
- Resource constraints force triage decisions (cannot investigate every lead).
- Intelligence briefs require interpretation, not just reading.

**Learning Objectives:**

- Detect AI-enhanced social engineering.
- Manage coordinated multi-vector attacks.
- Identify long-term persistent threat campaigns.
- Adapt to novel attack techniques.
- Triage under extreme resource constraints.
- Conduct adversary behavior analysis.

**Measurable Criteria for Advancement:** >65% detection rate on Tier 4 scenarios across 50+ decisions with <25% false positive rate and demonstrated ability to identify multi-stage campaigns.

---

#### Tier 5: Black Zone (Expert / Endgame)

**Player Profile:** Expert-level security awareness. Proactive threat hunting mindset. Effective adversary modeling and anticipation.

**Threat Characteristics:**

- Near-perfect social engineering with minimal or no detectable indicators.
- Strategic adversary operations (attackers with defined campaign objectives, not just opportunistic attempts).
- Deep fake-style identity fraud (synthetic persons with complete fabricated verification histories).
- Attacks against the player's own security tools and processes.
- Strategic deception (adversaries feeding false intelligence through channels the player trusts).
- Ethical dilemmas (refusing a legitimate request to maintain security may cost lives in the game's fiction).
- Situations where available evidence is genuinely ambiguous and no "correct" answer exists.

**Game Parameters:**

- Maximum request volume and concurrent tasks.
- Real-time decision requirements.
- Adaptive adversary AI that learns player patterns.
- Terminal breach consequences (game over potential).
- Incomplete and contradictory intelligence.
- Resource scarcity forces impossible trade-offs.

**Learning Objectives:**

- Operate effectively in ambiguous threat environments.
- Make defensible decisions with incomplete information.
- Balance security with operational requirements.
- Anticipate and preempt adversary strategies.
- Lead security operations under crisis conditions.

**Measurable Criteria:** This tier has no advancement -- it is the endgame. Performance is measured by survival duration and cumulative score.

### 5.3 Adaptive Difficulty Modulation

Within each tier, difficulty adapts dynamically based on player performance using the following parameters:

#### 5.3.1 Performance Metrics Tracked

| Metric                                          | Impact on Difficulty                                                                                                                                 |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Detection rate (last 10 decisions)              | Low detection -> reduce difficulty within tier; High detection -> increase difficulty within tier                                                    |
| False positive rate (last 10 decisions)         | High false positive -> introduce more legitimate requests; Low false positive -> introduce more ambiguous scenarios                                  |
| Decision speed (average time per decision)      | Consistently fast + accurate -> reduce timers; Slow -> extend timers                                                                                 |
| Streak tracking (consecutive correct/incorrect) | 5+ correct streak -> difficulty bump; 3+ incorrect streak -> difficulty reduction                                                                    |
| Verification thoroughness                       | Consistently thorough -> present scenarios requiring deeper investigation; Cursory verification -> present scenarios where surface-level checks fail |

#### 5.3.2 Difficulty Adjustment Levers

The following parameters can be adjusted independently to modulate difficulty:

```
DIFFICULTY PARAMETERS
+----------------------------------+-------------------+-------------------+
| Parameter                        | Easier            | Harder            |
+----------------------------------+-------------------+-------------------+
| Grammatical quality of threats   | Errors present    | Flawless          |
| Domain similarity to legitimate  | Obviously fake    | Near-identical    |
| Pretext plausibility             | Implausible       | Highly credible   |
| Request volume per day           | 1-3               | 8-12+             |
| Decision timer duration          | 120 seconds       | 15 seconds        |
| Ratio of threats to legitimate   | 30/70             | 60/40             |
| Verification data completeness   | Complete          | Partial/missing   |
| Concurrent incidents             | None              | Multiple          |
| Adversary persistence            | Single attempt    | Multi-day campaign|
| Available resources              | Abundant          | Severely limited  |
| Consequence severity             | Warning           | Game-ending       |
| Intelligence brief clarity       | Explicit          | Ambiguous         |
+----------------------------------+-------------------+-------------------+
```

#### 5.3.3 Anti-Frustration and Anti-Complacency Mechanisms

**Anti-Frustration:**

- If a player fails the same scenario type three times consecutively, provide a targeted tutorial explaining the missed indicators.
- If overall performance drops below 40% detection rate, temporarily reduce difficulty to rebuild confidence before resuming normal progression.
- After a catastrophic breach, provide a detailed post-mortem showing exactly what was missed and why.
- Never reduce difficulty across tiers -- once a tier is earned, it is not lost.

**Anti-Complacency:**

- If a player maintains >95% detection rate for an extended period, inject a "surprise" scenario using a novel technique.
- Periodically introduce scenarios that superficially resemble previously defeated threats but use different underlying techniques.
- Long periods of calm (no breach attempts) should be punctuated by high-sophistication attacks, mirroring real-world "quiet before the storm" patterns.
- Leaderboard systems create social pressure for continuous improvement.

### 5.4 Role-Based Difficulty Tracks

Different organizational roles face different threat profiles. "The DMZ: Archive Gate" can support multiple difficulty tracks:

| Role Track        | Emphasis                                                                 | Unique Scenarios                                                      |
| ----------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| **General Staff** | Phishing detection, social engineering resistance, basic data protection | Standard email phishing, tailgating, USB safety                       |
| **IT/Technical**  | Technical threat indicators, incident response, system security          | Supply chain analysis, malware indicators, network anomalies          |
| **Management**    | Strategic decision-making, resource allocation, risk acceptance          | Whaling attacks, business email compromise, vendor risk decisions     |
| **Executive**     | High-value targeting, strategic deception, crisis management             | CEO fraud, board-level social engineering, crisis resource allocation |
| **Security Team** | Advanced threat detection, threat hunting, adversary modeling            | APT campaigns, coordinated attacks, intelligence analysis             |

---

## 6. Real-World Scenario Mapping: The DMZ: Archive Gate

### 6.1 Mapping Philosophy

Every mechanic in "The DMZ: Archive Gate" has a direct analog in real-world cybersecurity operations. This mapping is not metaphorical -- the cognitive processes required to succeed in the game are the same cognitive processes required to detect and respond to real cybersecurity threats. The game creates an experiential training loop where players develop instincts through practice that transfer directly to their professional responsibilities.

### 6.2 Comprehensive Mechanic-to-Threat Mapping

#### 6.2.1 Email Access Request System = Phishing Detection

**Game Mechanic:** Applicants submit access requests via email. Each request contains an applicant profile, assets at risk, and requested services. The player must determine whether the request is legitimate.

**Real-World Parallel:** Every employee receives emails daily that request action -- clicking links, opening attachments, transferring funds, sharing credentials, granting access. Distinguishing legitimate requests from attacks is the most critical everyday security skill.

**Specific Training Mappings:**

| Game Element                 | Real-World Skill                                    | Threat Category                            |
| ---------------------------- | --------------------------------------------------- | ------------------------------------------ |
| Sender identity analysis     | Verify sender email address and domain              | Phishing (all variants)                    |
| Request narrative evaluation | Assess whether the story makes sense                | Social engineering (pretexting)            |
| Urgency signals in requests  | Resist urgency pressure                             | Social engineering (authority, urgency)    |
| Inconsistency detection      | Spot contradictions in communication                | Phishing, BEC                              |
| Emotional appeal analysis    | Maintain objectivity despite sympathetic narratives | Social engineering (reciprocity, sympathy) |
| Volume management            | Maintain vigilance despite high workload            | Alert fatigue management                   |
| Time pressure decisions      | Make good decisions under deadline                  | Operational security                       |

**Behavioral Outcome:** Players develop the habit of systematic email analysis -- checking sender, evaluating content, verifying claims, and resisting pressure -- that transfers directly to real-world email handling.

---

#### 6.2.2 Phishing Analysis Worksheet = Structured Threat Assessment

**Game Mechanic:** A structured analysis tool that prompts players to evaluate signals of legitimacy and red flags in each access request.

**Real-World Parallel:** Security Operations Centers (SOCs) use structured analysis frameworks, playbooks, and checklists to evaluate potential threats. The worksheet trains systematic, repeatable analysis rather than gut-feeling decisions.

**Specific Training Mappings:**

| Game Element                          | Real-World Skill                             | Threat Category                   |
| ------------------------------------- | -------------------------------------------- | --------------------------------- |
| Red flag checklist                    | Indicator of Compromise (IOC) identification | All threat categories             |
| Legitimacy signal evaluation          | True positive vs. false positive triage      | Phishing, social engineering      |
| Evidence-based decision documentation | Incident documentation                       | Incident response                 |
| Structured reasoning                  | Analytical rigor over intuition              | Decision-making under uncertainty |

**Behavioral Outcome:** Players learn to use structured analysis tools rather than relying on instinct, building the habit of systematic threat assessment that is the foundation of professional security operations.

---

#### 6.2.3 Verification Packet = Identity and Access Management (IAM)

**Game Mechanic:** Verification packets contain proof of identity, ownership, and chain-of-custody documentation that players must evaluate before granting access.

**Real-World Parallel:** Identity and Access Management (IAM) systems verify that users are who they claim to be (authentication) and have the right to access the resources they request (authorization). In enterprise environments, this includes identity proofing, credential verification, access request workflows, and periodic access reviews.

**Specific Training Mappings:**

| Game Element                         | Real-World Skill                      | Threat Category                       |
| ------------------------------------ | ------------------------------------- | ------------------------------------- |
| Identity proof evaluation            | Identity proofing and KYC             | Social engineering, identity fraud    |
| Ownership documentation review       | Access authorization verification     | Privilege escalation, insider threats |
| Chain-of-custody validation          | Trust chain verification              | Supply chain attacks                  |
| Document authenticity assessment     | Certificate and credential validation | Deepfakes, forged credentials         |
| Cross-referencing multiple documents | Multi-factor verification             | AI-powered threats                    |

**Behavioral Outcome:** Players develop the discipline of thorough identity verification before granting access, directly applicable to real-world IAM processes, vendor onboarding, and trust decisions.

---

#### 6.2.4 Access Decisions (Accept/Reject) = Access Control Policy Enforcement

**Game Mechanic:** The player is the final authority on who gets access to the data center. Each decision is binary -- accept or reject -- with significant consequences for both.

**Real-World Parallel:** Access control is the fundamental security function: determining who can access what, under what conditions, and for how long. Every firewall rule, every IAM policy, every physical access control is an accept/reject decision.

**Specific Training Mappings:**

| Game Element                   | Real-World Skill                                | Threat Category                   |
| ------------------------------ | ----------------------------------------------- | --------------------------------- |
| Accept/reject decision         | Allow/deny access control                       | All threat categories             |
| Risk/reward evaluation         | Risk acceptance framework                       | Risk management                   |
| Capacity consideration         | Resource allocation and prioritization          | Operational security              |
| Attack surface awareness       | Understanding that each approval increases risk | Attack surface management         |
| Blacklist/whitelist management | Block/allow list maintenance                    | Threat hunting, incident response |

**Behavioral Outcome:** Players internalize the principle that every access decision is a security decision, and that granting access always increases risk. This mindset transfers directly to real-world decisions about permissions, network access, and vendor trust.

---

#### 6.2.5 Upgrade Management = Patch Management and Change Control

**Game Mechanic:** Players purchase upgrades that increase capacity, cooling stability, and security tooling. However, "every upgrade triggers new threat vectors."

**Real-World Parallel:** Patch management and change control are critical security processes. Every software update, system upgrade, and configuration change can introduce new vulnerabilities even as it fixes old ones. Change management requires evaluating the security implications of every modification to the environment.

**Specific Training Mappings:**

| Game Element                     | Real-World Skill                       | Threat Category          |
| -------------------------------- | -------------------------------------- | ------------------------ |
| Upgrade cost/benefit analysis    | Patch risk assessment                  | Vulnerability management |
| New threat vectors from upgrades | Change-induced vulnerability awareness | All technical threats    |
| Upgrade prioritization           | Patch prioritization (CVSS scoring)    | Malware, exploitation    |
| Resource allocation for upgrades | Security budget management             | Organizational security  |
| Timing of upgrades               | Maintenance window planning            | Operational security     |
| Security tooling purchases       | Security tool selection and deployment | Defense in depth         |

**Behavioral Outcome:** Players learn that security is not a static state but a continuous process of improvement, adaptation, and risk management. Every change has security implications. This transfers directly to real-world change management discipline.

---

#### 6.2.6 Breach Consequence System = Incident Response and Business Continuity

**Game Mechanic:** A successful breach triggers a ransom note. The ransom costs total earnings divided by 10, rounded up with a minimum of one euro. Operations stay locked behind the ransom note until payment is confirmed. If the player cannot pay, the game is over.

**Real-World Parallel:** Ransomware attacks lock critical systems and demand payment. Incident response, business continuity, and disaster recovery plans determine whether an organization survives a breach. The financial impact of ransomware can be existential, especially for smaller organizations.

**Specific Training Mappings:**

| Game Element                     | Real-World Skill                      | Threat Category           |
| -------------------------------- | ------------------------------------- | ------------------------- |
| Ransom note event                | Ransomware incident recognition       | Ransomware                |
| Financial impact (earnings / 10) | Business impact assessment            | Business continuity       |
| Operations lockout               | Business disruption awareness         | Operational resilience    |
| Pay or game over decision        | Ransom payment decision framework     | Crisis management         |
| Post-breach recovery             | Incident recovery and lessons learned | Incident response         |
| Financial reserve management     | Cyber insurance and reserve planning  | Financial risk management |

**Behavioral Outcome:** Players experience the visceral consequence of security failures -- lost resources, locked operations, potential game termination. This emotional impact creates strong associative learning: security failures cause real, painful consequences. The lesson transfers to real-world urgency around prevention.

---

#### 6.2.7 Threat Assessment Sheet = Security Operations Center (SOC) Analysis

**Game Mechanic:** Risk scores, known indicators, and recommended actions for each threat encountered.

**Real-World Parallel:** SOC analysts use threat intelligence platforms, SIEM tools, and structured analysis to evaluate alerts, score risks, and recommend actions.

**Specific Training Mappings:**

| Game Element                 | Real-World Skill                                 | Threat Category             |
| ---------------------------- | ------------------------------------------------ | --------------------------- |
| Risk score evaluation        | Threat severity assessment (CVSS, risk matrices) | All threats                 |
| Known indicator matching     | IOC correlation                                  | Threat intelligence         |
| Recommended action selection | Response playbook execution                      | Incident response           |
| Threat pattern recognition   | Threat hunting                                   | Advanced persistent threats |

---

#### 6.2.8 Incident Log = Security Information and Event Management (SIEM)

**Game Mechanic:** Timeline of attacks, breaches, and mitigations documenting the history of security events.

**Real-World Parallel:** SIEM systems aggregate, correlate, and analyze security events from across the organization, maintaining a comprehensive timeline that enables detection of patterns and supports forensic investigation.

**Specific Training Mappings:**

| Game Element                  | Real-World Skill                   | Threat Category        |
| ----------------------------- | ---------------------------------- | ---------------------- |
| Timeline review               | Log analysis and event correlation | All threats            |
| Attack pattern identification | Threat hunting and trend analysis  | APT campaigns          |
| Mitigation documentation      | Incident response documentation    | Incident response      |
| Historical analysis           | Forensic investigation             | Post-incident analysis |

---

#### 6.2.9 Data Salvage Contract = Vendor and Data Processing Agreements

**Game Mechanic:** Terms, liabilities, and fee structures governing data storage and recovery services.

**Real-World Parallel:** Data Processing Agreements (DPAs), Service Level Agreements (SLAs), and vendor contracts define the security obligations, liabilities, and terms of data handling between organizations.

**Specific Training Mappings:**

| Game Element             | Real-World Skill               | Threat Category               |
| ------------------------ | ------------------------------ | ----------------------------- |
| Terms evaluation         | Contract security review       | Supply chain, data protection |
| Liability assessment     | Risk transfer and acceptance   | Risk management               |
| Fee structure analysis   | Cost of security analysis      | Resource management           |
| Service scope definition | Data handling scope limitation | Data protection               |

---

#### 6.2.10 Storage Lease Agreement = Data Retention and Lifecycle Management

**Game Mechanic:** Capacity, term length, and renewal options for data storage.

**Real-World Parallel:** Data retention policies define how long data is kept, when it is reviewed, and when and how it is securely destroyed. Proper data lifecycle management reduces the attack surface by minimizing the amount of stored data.

**Specific Training Mappings:**

| Game Element           | Real-World Skill                   | Threat Category       |
| ---------------------- | ---------------------------------- | --------------------- |
| Capacity management    | Storage and data volume governance | Data protection       |
| Term length decisions  | Data retention period compliance   | Regulatory compliance |
| Renewal evaluation     | Periodic access review             | Insider threats       |
| Reclamation for resale | Secure data destruction            | Data protection       |

---

#### 6.2.11 Blacklist Notice = Threat Blocking and Indicator Management

**Game Mechanic:** Entities barred from access and the rationale for barring them.

**Real-World Parallel:** IP blocklists, domain blacklists, threat actor databases, and debarment lists are critical tools for preventing known threats from accessing organizational resources.

**Specific Training Mappings:**

| Game Element                     | Real-World Skill                       | Threat Category             |
| -------------------------------- | -------------------------------------- | --------------------------- |
| Blacklist criteria evaluation    | Blocklist management and hygiene       | All threats                 |
| Rationale documentation          | Threat documentation and justification | Incident response           |
| Blacklist evasion by adversaries | Adversary adaptation and evasion       | Advanced persistent threats |
| False blacklisting risk          | False positive management              | Operational efficiency      |

---

#### 6.2.12 Whitelist Exception = Emergency Access and Policy Exception Management

**Game Mechanic:** Emergency access overrides requiring signatures and justification.

**Real-World Parallel:** Security policy exceptions are sometimes necessary for business continuity. Emergency access procedures, break-glass accounts, and policy exception workflows ensure that exceptions are documented, justified, time-limited, and reviewed.

**Specific Training Mappings:**

| Game Element                 | Real-World Skill                 | Threat Category   |
| ---------------------------- | -------------------------------- | ----------------- |
| Emergency override decisions | Break-glass procedure execution  | Crisis management |
| Signature requirements       | Multi-party authorization        | Access control    |
| Exception documentation      | Policy exception tracking        | Compliance        |
| Override exploitation risk   | Emergency access abuse awareness | Insider threats   |

---

#### 6.2.13 Facility Status Report = Security Posture Monitoring

**Game Mechanic:** Power, cooling, and utilization metrics for the data center.

**Real-World Parallel:** Security posture monitoring continuously assesses the health, capacity, and vulnerability status of organizational infrastructure.

**Specific Training Mappings:**

| Game Element                 | Real-World Skill                          | Threat Category      |
| ---------------------------- | ----------------------------------------- | -------------------- |
| Power monitoring             | Infrastructure health monitoring          | Physical security    |
| Cooling stability            | Environmental threat monitoring           | Physical security    |
| Utilization metrics          | Capacity planning and overload prevention | Operational security |
| Anomaly detection in metrics | Baseline deviation detection              | All threats          |

---

#### 6.2.14 Intelligence Brief = Cyber Threat Intelligence (CTI)

**Game Mechanic:** Current attacker behavior and active campaigns shared with the player.

**Real-World Parallel:** Cyber Threat Intelligence (CTI) reports from ISACs, government agencies, and commercial vendors inform defensive priorities and enable proactive threat detection.

**Specific Training Mappings:**

| Game Element                        | Real-World Skill                     | Threat Category      |
| ----------------------------------- | ------------------------------------ | -------------------- |
| Attacker behavior analysis          | Threat actor profiling               | APT, organized crime |
| Active campaign awareness           | Threat landscape monitoring          | All threats          |
| Intelligence-driven decision making | Intelligence-led security operations | Strategic security   |
| Information reliability assessment  | Source reliability evaluation        | Threat intelligence  |

---

#### 6.2.15 Ransom Note = Ransomware Incident Response

**Game Mechanic:** Payment demand and deadline after a breach.

**Real-World Parallel:** Ransomware incident response, including payment decision frameworks, law enforcement notification, recovery procedures, and post-incident analysis.

**Specific Training Mappings:**

| Game Element                 | Real-World Skill                           | Threat Category     |
| ---------------------------- | ------------------------------------------ | ------------------- |
| Payment demand evaluation    | Ransom negotiation awareness               | Ransomware          |
| Deadline pressure            | Crisis decision-making under time pressure | Incident response   |
| Financial impact calculation | Business impact assessment                 | Business continuity |
| Post-ransom recovery         | Incident recovery and hardening            | Resilience          |

---

### 6.3 Comprehensive Mapping Summary

```
+------------------------------------------+------------------------------------------+
| GAME MECHANIC                            | REAL-WORLD CYBERSECURITY DOMAIN          |
+------------------------------------------+------------------------------------------+
| Email Access Request                     | Phishing Detection & Email Security      |
| Phishing Analysis Worksheet              | SOC Analysis & Structured Assessment     |
| Verification Packet                      | Identity & Access Management (IAM)       |
| Accept/Reject Decisions                  | Access Control Policy Enforcement        |
| Upgrade Management                       | Patch Mgmt & Change Control              |
| Breach Consequence (Ransom)              | Incident Response & Business Continuity  |
| Threat Assessment Sheet                  | Threat Intelligence & Risk Scoring       |
| Incident Log                             | SIEM & Event Correlation                 |
| Data Salvage Contract                    | Vendor Agreements & DPAs                 |
| Storage Lease Agreement                  | Data Retention & Lifecycle Mgmt          |
| Blacklist Notice                         | Threat Blocking & Indicator Mgmt         |
| Whitelist Exception                      | Emergency Access & Policy Exceptions     |
| Facility Status Report                   | Security Posture Monitoring              |
| Intelligence Brief                       | Cyber Threat Intelligence (CTI)          |
| Ransom Note                              | Ransomware Incident Response             |
| Resource Management (Rack/Bandwidth)     | Attack Surface Management                |
| Client Management                        | Third-Party Risk Management              |
| Adversary Escalation                     | Threat Landscape Evolution               |
| Daily Priority Shifts                    | Dynamic Risk Prioritization              |
| Financial Management                     | Security ROI & Budget Justification      |
+------------------------------------------+------------------------------------------+
```

---

## Appendix A: Threat-to-Mechanic Cross-Reference Matrix

This matrix shows which game mechanics address which threat categories, enabling gap analysis and content planning.

| Threat Category    | Email Request | Phishing Worksheet | Verification Packet | Accept/Reject | Upgrade Mgmt | Breach System | Threat Sheet | Incident Log | Data Contract | Blacklist | Whitelist | Facility Report | Intel Brief | Ransom Note |
| ------------------ | ------------- | ------------------ | ------------------- | ------------- | ------------ | ------------- | ------------ | ------------ | ------------- | --------- | --------- | --------------- | ----------- | ----------- |
| Phishing           | X             | X                  | X                   | X             | -            | X             | X            | X            | -             | X         | -         | -               | X           | -           |
| Social Engineering | X             | X                  | X                   | X             | -            | X             | X            | X            | -             | X         | X         | -               | X           | -           |
| Malware            | -             | -                  | X                   | X             | X            | X             | X            | X            | X             | X         | -         | X               | X           | X           |
| Password Security  | -             | -                  | X                   | X             | X            | X             | X            | X            | -             | -         | -         | -               | X           | -           |
| Data Protection    | -             | -                  | -                   | X             | -            | X             | -            | X            | X             | -         | -         | X               | -           | X           |
| Physical Security  | -             | -                  | -                   | -             | X            | X             | -            | X            | -             | -         | -         | X               | X           | -           |
| Network Security   | -             | -                  | -                   | X             | X            | X             | X            | X            | -             | X         | -         | X               | X           | -           |
| Cloud Security     | -             | -                  | -                   | X             | X            | X             | X            | X            | X             | -         | -         | X               | X           | -           |
| Supply Chain       | -             | X                  | X                   | X             | X            | X             | X            | X            | X             | X         | -         | -               | X           | -           |
| Insider Threats    | -             | -                  | X                   | X             | -            | X             | X            | X            | X             | X         | X         | X               | X           | -           |
| AI-Powered Threats | X             | X                  | X                   | X             | -            | X             | X            | X            | -             | X         | -         | -               | X           | -           |
| IoT Security       | -             | -                  | -                   | -             | X            | X             | X            | X            | -             | -         | -         | X               | X           | -           |

Legend: X = primary coverage, - = not directly covered by this mechanic

---

## Appendix B: MITRE ATT&CK Technique Coverage

### Priority 1: Techniques Directly Simulated by Game Mechanics

| ATT&CK ID | Technique Name                 | Game Mechanic                            | Priority |
| --------- | ------------------------------ | ---------------------------------------- | -------- |
| T1566     | Phishing                       | Email Access Request                     | Critical |
| T1566.001 | Spearphishing Attachment       | Verification Packet (malicious docs)     | Critical |
| T1566.002 | Spearphishing Link             | Email Access Request (embedded URLs)     | Critical |
| T1598     | Phishing for Information       | Reconnaissance emails preceding requests | High     |
| T1195     | Supply Chain Compromise        | Malware in client backups                | Critical |
| T1199     | Trusted Relationship           | Client relationship exploitation         | High     |
| T1078     | Valid Accounts                 | Compromised client credentials           | High     |
| T1036     | Masquerading                   | Fake organizational identities           | Critical |
| T1656     | Impersonation                  | Identity fraud in access requests        | Critical |
| T1486     | Data Encrypted for Impact      | Breach/Ransom system                     | Critical |
| T1657     | Financial Theft                | Ransom payment mechanic                  | High     |
| T1204.002 | User Execution: Malicious File | Accepting contaminated data              | High     |

### Priority 2: Techniques Contextually Covered

| ATT&CK ID | Technique Name               | Game Context                             | Priority |
| --------- | ---------------------------- | ---------------------------------------- | -------- |
| T1589     | Gather Victim Identity Info  | Adversary OSINT on data center           | Medium   |
| T1593     | Search Open Websites/Domains | Adversary research of public info        | Medium   |
| T1098     | Account Manipulation         | Clients expanding access beyond terms    | Medium   |
| T1136     | Create Account               | Adversaries creating new fake identities | Medium   |
| T1548     | Abuse Elevation Control      | Clients accessing unauthorized data      | Medium   |
| T1070     | Indicator Removal            | Adversaries adapting to avoid detection  | Medium   |
| T1110     | Brute Force                  | Automated attacks on data center auth    | Medium   |
| T1213     | Data from Information Repos  | Attackers targeting stored client data   | Medium   |
| T1485     | Data Destruction             | Attacks intended to destroy client data  | Medium   |
| T1489     | Service Stop                 | Attacks disrupting operations            | Medium   |

### Priority 3: Techniques for Future Content Development

| ATT&CK ID | Technique Name                    | Planned Mechanic                       | Priority |
| --------- | --------------------------------- | -------------------------------------- | -------- |
| T1583     | Acquire Infrastructure            | Adversary infrastructure in game world | Low      |
| T1584     | Compromise Infrastructure         | Compromised networks in game world     | Low      |
| T1059     | Command and Scripting Interpreter | Advanced malware analysis scenarios    | Low      |
| T1114     | Email Collection                  | Communication interception scenarios   | Low      |
| T1528     | Steal Application Access Token    | Token/credential theft scenarios       | Medium   |

---

## Appendix C: Sources and References

### Threat Landscape Reports

- World Economic Forum. _Global Cybersecurity Outlook 2026_. January 2026.
- CrowdStrike. _2025 Global Threat Report_. February 2025.
- Deloitte. _Cybersecurity Report 2025: AI Threats, Email Server Security, and Advanced Threat Actors_. 2025.
- Cyble. _Top 10 Threat Actor Trends of 2025 and Signals for 2026_. December 2025.
- Sophos. _2025 State of Ransomware Report_. 2025.
- Verizon. _2025 Data Breach Investigations Report_. 2025.
- Ponemon Institute. _2025 Cost of Insider Threats Global Report_. 2025.
- Forescout. _2025 Device Vulnerability Report_. 2025.
- Cloud Security Alliance. _The State of SaaS Security: 2025-2026_. 2025.
- Panorays. _2026 Study: Third-Party Threat Visibility_. January 2026.
- Flashpoint. _Insider Threats: Turning 2025 Intelligence into a 2026 Defense Strategy_. January 2026.

### Phishing and Social Engineering

- APWG. _Phishing Activity Trends Report, Q1 2025_. 2025.
- Keepnet Labs. _2025 Phishing Statistics (Updated January 2026)_. 2026.
- Hornetsecurity. _Cybersecurity Report 2026: Malware, Email Security_. 2025.
- DeepStrike. _Vishing Statistics 2025: AI Deepfakes & the $40B Voice Scam Surge_. 2025.

### AI-Powered Threats

- DeepStrike. _Deepfake Statistics 2025: The Data Behind the AI Fraud Wave_. 2025.
- Cyble. _Deepfake-as-a-Service Exploded in 2025: 2026 Threats Ahead_. January 2026.
- ZeroThreat. _Deepfake Attacks & AI-Generated Phishing: 2025 Statistics_. 2025.
- Experian. _AI Takes Center Stage as the Major Threat to Cybersecurity in 2026_. 2025.

### Ransomware

- VikingCloud. _46 Ransomware Statistics and Trends Report 2026_. 2026.
- Recorded Future. _New Ransomware Tactics to Watch Out for in 2026_. 2026.
- SOCRadar. _Top 10 Ransomware Attacks of 2025_. 2025.
- GuidePoint Security. _Ransomware Victims Report 2025_. 2025.

### Supply Chain

- Integrity360. _The Biggest Cyber Attacks of 2025 and What They Mean for 2026_. 2025.
- Ethixbase360. _Supply Chain Cybersecurity 2026_. 2026.
- Dark Reading. _Supply Chain Worms 2026_. 2026.
- SOCRadar. _Top 10 Supply Chain Attacks of 2025_. 2025.

### Password and Credential Security

- DeepStrike. _70+ Password Statistics 2026: What the Numbers Really Say_. 2026.
- CinchOps. _Password Leak Study: 94% of Passwords Reused_. 2025.
- BlackFog. _Brute Force Attacks in 2025_. 2025.

### IoT Security

- Industrial Cyber. _Forescout 2025 Report: Device Vulnerabilities_. 2025.
- DeepStrike. _IoT Hacking Statistics 2025_. 2025.
- Growth Acceleration Partners. _52 Hours Under Attack: IoT Security in 2025_. 2025.

### Cloud Security

- CheckRed. _2025 Breaches Recap and 2026 Cloud & SaaS Security Outlook_. 2026.
- SentinelOne. _Shadow Data: Hidden Risks & Mitigation Strategies for 2026_. 2026.
- SentinelOne. _17 Security Risks of Cloud Computing in 2026_. 2026.
- Reco AI. _AI & Cloud Security Breaches: 2025 Year in Review_. 2025.

### Gamification and Training Effectiveness

- Hoxhunt. _Does Gamified Cyber Security Training Actually Work?_ 2025.
- OutThink. _How Gamification Drives Adaptive Security Awareness Training_. 2025.
- PMC/NIH. _A Systematic Mapping Study on Gamification within Information Security Awareness Programs_. 2024.
- Keepnet Labs. _Gamification in Security Training_. 2025.

### Framework References

- MITRE ATT&CK. https://attack.mitre.org/
- NIST Cybersecurity Framework. https://www.nist.gov/cyberframework
- OWASP. https://owasp.org/

---

_This document is a living artifact. It will be updated quarterly to reflect the evolving threat landscape, new game mechanics, and emerging training methodologies. Next scheduled review: 2026-05-05._

_Document prepared for Matrices GmbH -- The DMZ: Archive Gate development team._
