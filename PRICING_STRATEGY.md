# RefOpenMic Pricing Strategy & Cost Analysis

**Version:** 2.0
**Date:** 2026-04-20
**Platform:** Native iOS & Android (Flutter)
**Status:** Draft for Review

---

## Executive Summary

RefOpenMic is a real-time voice communication platform for referee teams using LiveKit WebRTC infrastructure and Firebase backend. This document analyzes infrastructure costs for native mobile apps and proposes a sustainable freemium pricing model.

**Key Findings:**
- Primary cost: LiveKit WebRTC at $0.0005/minute per participant (after free tier)
- Marginal cost per match: $0.65 - $5.25 depending on participant count
- App store fees: 15-30% of subscription revenue
- Recommended pricing: Free tier + Pro tier at $9.99/month ($79/year)
- Estimated gross margin: 45-55% after app store fees

---

## 1. Infrastructure Costs

### 1.1 LiveKit Pricing (Primary Cost)

LiveKit charges for **WebRTC participant minutes** - total time all connected users spend in audio rooms. Publishers (refs) and subscribers (spectators) are charged at the same rate.

| Plan | Monthly Base | Included Minutes | Overage Rate | Concurrent Users |
|------|--------------|------------------|--------------|------------------|
| **Build (Free)** | $0 | 5,000 min | Hard cap | 100 |
| **Ship** | $50 | 150,000 min | $0.0005/min | 1,000 |
| **Scale** | $500 | 1,500,000 min | $0.0004/min | 5,000 |

### 1.2 Cost Per Match

**Formula:** (Refs + Spectators) × Duration (min) = Total Participant-Minutes × $0.0005

| Match Type | Participants | Duration | Minutes | Cost |
|------------|-------------|----------|---------|------|
| Small | 3 refs + 10 spectators | 100 min | 1,300 | $0.65 |
| Medium | 5 refs + 30 spectators | 100 min | 3,500 | $1.75 |
| Large | 5 refs + 100 spectators | 100 min | 10,500 | $5.25 |
| **Free Tier** | **3 refs + 12 spectators** | **100 min** | **1,500** | **$0.75** |

### 1.3 Monthly Cost Scenarios (Ship Plan: $50/month)

| Volume | Avg Participants | Total Minutes | LiveKit Cost | Cost/Match |
|--------|------------------|---------------|--------------|------------|
| 10 matches | 35 | 35,000 | $50.00 | $5.00 |
| 20 matches | 35 | 70,000 | $50.00 | $2.50 |
| 40 matches | 35 | 140,000 | $50.00 | $1.25 |
| 100 matches | 35 | 350,000 | $150.00 | $1.50 |
| 300 matches | 35 | 1,050,000 | $470.00 | $1.57 |

**Key Insight:** Ship plan ($50) includes 150,000 minutes. Most scenarios stay within base plan or have minimal overages.

### 1.4 Total Infrastructure Costs

| Service | Monthly Cost | Notes |
|---------|--------------|-------|
| LiveKit Ship | $50-470 | Scales with usage |
| Firestore | $5-15 | Mostly free tier |
| Firebase Auth | $0 | Free tier sufficient |
| **Infrastructure Total** | **$55-485/month** | **LiveKit is 95% of costs** |

### 1.5 App Store Fees (Critical for Native)

| Platform | Year 1 Fee | Year 2+ Fee | Annual Fee |
|----------|-----------|-------------|------------|
| **Apple App Store** | 30% | 15% | 15% |
| **Google Play** | 15% | 15% | 15% |
| **Web (Stripe)** | 3% | 3% | 3% |

**Impact on $9.99/month subscription:**
- iOS Year 1: $6.99 net (30% fee)
- iOS Year 2+: $8.49 net (15% fee)
- Android: $8.49 net (15% fee)
- **Blended average: ~$7.99 net** (assuming 60% iOS, 40% Android, mixed tenure)

---

## 2. Pricing Strategy

### Free Tier - $0/month

**For Match Creators:**
- 3 active referees per match
- 12 spectators per match
- 100-minute session limit
- Unlimited match creation
- Full admin controls

**For Spectators:**
- Browse all public matches
- Listen free (subject to match capacity)

**Economics:** $0.75 cost per match → sustainable as acquisition funnel

### Pro Tier - $9.99/month or $79/year

**Everything in Free, plus:**
- 10 active referees per match
- 100 spectators per match
- Unlimited session duration
- Private matches with codes
- Match statistics & history
- Priority support

**Why $9.99/month:**
- Still cheaper than radio rentals ($20-50/month)
- Accounts for 15-30% app store fees
- Maintains 45-55% margins after fees
- Annual option ($79/year) saves $40, improves retention

**Economics:** $1-5 cost per match, $7.99 net revenue → strong margins

---

## 3. Financial Projections (Month 12)

### Revenue Scenarios

| Metric | Conservative | Moderate | Optimistic |
|--------|-------------|----------|------------|
| Total Users | 200 | 500 | 1,000 |
| Pro Subscribers | 20 (10%) | 75 (15%) | 200 (20%) |
| Annual Subscribers | 40% | 50% | 60% |
| **Gross MRR** | **$200** | **$749** | **$1,998** |
| App Store Fees (20% avg) | -$40 | -$150 | -$400 |
| **Net MRR** | **$160** | **$599** | **$1,598** |

### Cost Scenarios

| Metric | Conservative | Moderate | Optimistic |
|--------|-------------|----------|------------|
| Matches/Month | 50 | 150 | 300 |
| Total Minutes | 100,000 | 450,000 | 1,050,000 |
| LiveKit | $50 | $200 | $470 |
| Firebase/Other | $10 | $20 | $40 |
| **Total Costs** | **$60** | **$220** | **$510** |

### Profitability

| Scenario | Net Revenue | Costs | **Profit** | **Margin** |
|----------|-------------|-------|-----------|-----------|
| Conservative | $160 | $60 | **$100** | **63%** |
| Moderate | $599 | $220 | **$379** | **63%** |
| Optimistic | $1,598 | $510 | **$1,088** | **68%** |

**Key Finding:** 60-70% gross margins maintained with $9.99 pricing after app store fees.

**Break-Even:** 10-15 Pro subscribers covers all infrastructure costs.

---

## 4. Implementation Roadmap

### Phase 1: POC - Months 1-3
- Use LiveKit Build plan (free, 5,000 min/month)
- Free tier only: 3 refs, 12 spectators, 100-minute limit
- Track actual usage in LiveKit dashboard
- **Goal:** Validate audio quality, gather 10+ real matches of data

### Phase 2: Native Migration - Months 4-6
- Build Flutter iOS/Android apps
- Upgrade to LiveKit Ship plan ($50/month)
- Implement Stripe for web subscriptions (bypass app store fees initially)
- Add tier management and limits
- **Goal:** Native apps in beta with 10+ Pro subscribers

### Phase 3: Paid Launch - Months 7-9
- Launch Free + Pro ($9.99/month, $79/year) publicly
- Add in-app purchases (App Store subscriptions)
- Implement usage analytics dashboard
- **Goal:** Revenue covers costs, validate pricing

### Phase 4: Growth - Months 10-12
- Marketing to referee associations
- Add Pro features (match recordings, analytics)
- Optimize costs (LiveKit settings, Firebase queries)
- **Goal:** 50+ Pro subscribers, net positive

---

## 5. Key Metrics to Track

### LiveKit Dashboard (Weekly)

| Metric | Target | Alert At |
|--------|--------|----------|
| Participant-minutes/month | < 150,000 | > 120,000 |
| Peak concurrent users | < 1,000 | > 800 |
| Average minutes/match | 3,500 | > 10,000 |

### Business Metrics (Monthly)

| Metric | Target (Month 12) | Formula |
|--------|-------------------|---------|
| MRR | $500+ | Subscribers × Price |
| Gross Margin | > 60% | (Revenue - COGS) / Revenue |
| Free → Pro Conversion | 10-20% | Pro / Active Free Users |
| Churn Rate | < 5%/month | Cancels / Subscribers |
| LTV:CAC | > 5:1 | Lifetime Value / Acquisition Cost |

### Product Metrics (Weekly)

| Metric | Target | Notes |
|--------|--------|-------|
| Matches created/week | 10+ (POC), 50+ (Growth) | Leading indicator |
| Avg spectators/match | 15-30 | Engagement driver |
| Match completion rate | > 90% | Reached "ended" status |
| 28-day retention | > 40% | Users active after signup |

---

## 6. Risk Mitigation

**Cost Overruns:**
- Hard caps on spectators (12 free, 100 pro)
- Usage alerts at 80% of LiveKit allocation
- Automatic timeouts at duration limits

**Free Tier Abuse:**
- Rate limit: 5 concurrent matches per creator
- Analytics to identify patterns
- Proactive conversion outreach to top 10% users

**App Store Risks:**
- Annual subscriptions reduce effective fees
- Web-based subscription option (Stripe)
- Price increase clause in ToS

**LiveKit Pricing Changes:**
- Self-hosted LiveKit evaluation (future)
- Alternative providers (Agora, Twilio) research
- Annual LiveKit contract for price lock

---

## 7. Why Native vs PWA

**Critical Features Native Provides:**
- ✅ Background audio (essential for referees)
- ✅ Bluetooth headset integration (primary use case)
- ✅ Push notifications (match start alerts)
- ✅ Battery optimization for long matches
- ✅ Lock screen controls (mute/unmute while phone locked)
- ✅ App store discovery

**Trade-offs:**
- Higher development cost (4-6 weeks vs 2-3 weeks)
- App store fees (15-30% vs 3% Stripe)
- App review process (1-3 days per release)
- Developer accounts ($124/year)

**Verdict:** Native is essential for referee use case. App store fees justify $9.99 pricing.

---

## 8. Recommendations

### Immediate Actions
1. ✅ Continue POC on LiveKit Build (free tier)
2. ✅ Collect 30 days of usage data
3. ✅ Validate cost assumptions with real matches
4. ✅ Track actual participant counts and durations

### Next 90 Days
1. Build Flutter native apps (iOS + Android)
2. Set up Stripe for subscriptions
3. Implement tier management in Firestore
4. Create upgrade flow UI
5. Upgrade to LiveKit Ship when approaching 5,000 minutes

### Launch Strategy
1. Soft launch to testers (free tier)
2. Introduce Pro tier at $9.99/month, $79/year
3. Promote annual heavily (better margins, retention)
4. A/B test pricing if early conversions are low
5. Monitor LiveKit costs weekly, optimize as needed

---

## Conclusion

RefOpenMic has **strong unit economics** with native mobile apps:

- **Free tier:** $0.75/match cost, sustainable acquisition
- **Pro tier:** $7.99 net revenue after app stores, $1-5 match cost
- **Margins:** 60-70% gross at all scales
- **Break-even:** 10-15 Pro subscribers

**The business model works.** LiveKit costs scale predictably. App store fees reduce margins by 20-25%, but $9.99 pricing compensates while remaining competitive with radio rentals.

**Next Steps:**
1. Complete POC with real usage data
2. Build Flutter apps (Months 4-6)
3. Launch paid tiers (Month 7)
4. Iterate based on conversion rates and feedback

---

**Version History:**
- v1.0 (2026-04-20): Initial PWA analysis
- v2.0 (2026-04-20): Updated for native iOS/Android with app store economics

**Last Updated:** 2026-04-20
