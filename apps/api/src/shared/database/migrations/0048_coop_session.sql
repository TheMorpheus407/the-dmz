-- Migration: 0048_coop_session
-- Description: Create co-op session infrastructure for M11-02: Co-op Session Service
--
-- Creates:
-- - multiplayer schema
-- - multiplayer.party table (co-op party/team entity)
-- - multiplayer.party_member table (party membership with player profiles)
-- - multiplayer.coop_session table (session state and metadata)
-- - multiplayer.coop_role_assignment table (role assignments per player)
-- - multiplayer.coop_decision_proposal table (decision proposals with conflict tracking)
-- - multiplayer.coop_incident_response table (incident response actions)
--
-- Required by Issue #253: M11-02: Co-op Session Service

-- Create multiplayer schema
CREATE SCHEMA IF NOT EXISTS multiplayer;

-- Party table - represents a co-op party/team
CREATE TABLE IF NOT EXISTS "multiplayer"."party" (
    "party_id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
    "tenant_id" uuid NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT,
    "name" varchar(100) NOT NULL,
    "max_members" integer DEFAULT 4 NOT NULL,
    "invite_code" varchar(20) UNIQUE,
    "status" varchar(20) DEFAULT 'open' NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "created_by" uuid REFERENCES "social"."player_profiles"("profile_id") ON DELETE SET NULL,
    "leader_id" uuid REFERENCES "social"."player_profiles"("profile_id") ON DELETE SET NULL
);

-- Indexes for party
CREATE INDEX IF NOT EXISTS "party_tenant_idx" ON "multiplayer"."party" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "party_invite_code_idx" ON "multiplayer"."party" USING btree ("invite_code");
CREATE INDEX IF NOT EXISTS "party_status_idx" ON "multiplayer"."party" USING btree ("status");

-- Enable RLS on party
ALTER TABLE "multiplayer"."party" ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant isolation on party
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'multiplayer' AND tablename = 'party' 
    AND policyname = 'tenant_isolation_party'
  ) THEN
    CREATE POLICY "tenant_isolation_party" ON "multiplayer"."party"
      FOR ALL
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

-- Party member table - links players to parties
CREATE TABLE IF NOT EXISTS "multiplayer"."party_member" (
    "member_id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
    "party_id" uuid NOT NULL REFERENCES "multiplayer"."party"("party_id") ON DELETE CASCADE,
    "player_id" uuid NOT NULL REFERENCES "social"."player_profiles"("profile_id") ON DELETE CASCADE,
    "role" varchar(30) DEFAULT 'member' NOT NULL,
    "joined_at" timestamp with time zone DEFAULT now() NOT NULL,
    "status" varchar(20) DEFAULT 'active' NOT NULL,
    "invited_by" uuid REFERENCES "social"."player_profiles"("profile_id") ON DELETE SET NULL,
    UNIQUE("party_id", "player_id")
);

-- Indexes for party_member
CREATE INDEX IF NOT EXISTS "party_member_party_idx" ON "multiplayer"."party_member" USING btree ("party_id");
CREATE INDEX IF NOT EXISTS "party_member_player_idx" ON "multiplayer"."party_member" USING btree ("player_id");
CREATE INDEX IF NOT EXISTS "party_member_status_idx" ON "multiplayer"."party_member" USING btree ("status");

-- Enable RLS on party_member
ALTER TABLE "multiplayer"."party_member" ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant isolation on party_member
-- Note: party_member joins through party to get tenant_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'multiplayer' AND tablename = 'party_member' 
    AND policyname = 'tenant_isolation_party_member'
  ) THEN
    CREATE POLICY "tenant_isolation_party_member" ON "multiplayer"."party_member"
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM "multiplayer"."party" p 
          WHERE p."party_id" = "multiplayer"."party_member"."party_id"
          AND (p."tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM "multiplayer"."party" p 
          WHERE p."party_id" = "multiplayer"."party_member"."party_id"
          AND (p."tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
        )
      );
  END IF;
END $$;

-- coop_session table - session state and metadata
CREATE TABLE IF NOT EXISTS "multiplayer"."coop_session" (
    "session_id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
    "tenant_id" uuid NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT,
    "party_id" uuid NOT NULL REFERENCES "multiplayer"."party"("party_id") ON DELETE RESTRICT,
    "seed" varchar(32) NOT NULL,
    "status" varchar(20) DEFAULT 'lobby' NOT NULL,
    "authority_player_id" uuid REFERENCES "social"."player_profiles"("profile_id") ON DELETE RESTRICT,
    "day_number" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "completed_at" timestamp with time zone
);

-- Indexes for coop_session
CREATE INDEX IF NOT EXISTS "coop_session_party_idx" 
    ON "multiplayer"."coop_session" USING btree ("party_id");
CREATE INDEX IF NOT EXISTS "coop_session_authority_idx" 
    ON "multiplayer"."coop_session" USING btree ("authority_player_id");
CREATE INDEX IF NOT EXISTS "coop_session_tenant_status_idx" 
    ON "multiplayer"."coop_session" USING btree ("tenant_id", "status");

-- coop_role_assignment table - role assignments per player
CREATE TABLE IF NOT EXISTS "multiplayer"."coop_role_assignment" (
    "assignment_id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
    "session_id" uuid NOT NULL REFERENCES "multiplayer"."coop_session"("session_id") ON DELETE CASCADE,
    "player_id" uuid NOT NULL REFERENCES "social"."player_profiles"("profile_id") ON DELETE RESTRICT,
    "role" varchar(20) NOT NULL,
    "is_authority" boolean DEFAULT false NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes for coop_role_assignment
CREATE INDEX IF NOT EXISTS "coop_role_assignment_session_idx" 
    ON "multiplayer"."coop_role_assignment" USING btree ("session_id");
CREATE INDEX IF NOT EXISTS "coop_role_assignment_player_idx" 
    ON "multiplayer"."coop_role_assignment" USING btree ("player_id");
CREATE UNIQUE INDEX IF NOT EXISTS "coop_role_assignment_session_player_unique" 
    ON "multiplayer"."coop_role_assignment" USING btree ("session_id", "player_id");

-- coop_decision_proposal table - decision proposals with conflict tracking
CREATE TABLE IF NOT EXISTS "multiplayer"."coop_decision_proposal" (
    "proposal_id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
    "session_id" uuid NOT NULL REFERENCES "multiplayer"."coop_session"("session_id") ON DELETE CASCADE,
    "player_id" uuid NOT NULL REFERENCES "social"."player_profiles"("profile_id") ON DELETE RESTRICT,
    "role" varchar(20) NOT NULL,
    "email_id" uuid NOT NULL,
    "action" varchar(30) NOT NULL,
    "status" varchar(20) DEFAULT 'proposed' NOT NULL,
    "authority_action" varchar(20),
    "conflict_flag" boolean DEFAULT false NOT NULL,
    "conflict_reason" varchar(40),
    "proposed_at" timestamp with time zone DEFAULT now() NOT NULL,
    "resolved_at" timestamp with time zone
);

-- Indexes for coop_decision_proposal
CREATE INDEX IF NOT EXISTS "coop_decision_proposal_session_idx" 
    ON "multiplayer"."coop_decision_proposal" USING btree ("session_id");
CREATE INDEX IF NOT EXISTS "coop_decision_proposal_player_idx" 
    ON "multiplayer"."coop_decision_proposal" USING btree ("player_id");
CREATE INDEX IF NOT EXISTS "coop_decision_proposal_session_email_idx" 
    ON "multiplayer"."coop_decision_proposal" USING btree ("session_id", "email_id");

-- coop_incident_response table - incident response actions
CREATE TABLE IF NOT EXISTS "multiplayer"."coop_incident_response" (
    "response_id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
    "session_id" uuid NOT NULL REFERENCES "multiplayer"."coop_session"("session_id") ON DELETE CASCADE,
    "player_id" uuid NOT NULL REFERENCES "social"."player_profiles"("profile_id") ON DELETE RESTRICT,
    "role" varchar(20) NOT NULL,
    "action" varchar(20) NOT NULL,
    "authority_approved" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes for coop_incident_response
CREATE INDEX IF NOT EXISTS "coop_incident_response_session_idx" 
    ON "multiplayer"."coop_incident_response" USING btree ("session_id");
CREATE INDEX IF NOT EXISTS "coop_incident_response_player_idx" 
    ON "multiplayer"."coop_incident_response" USING btree ("player_id");

-- Enable RLS on coop_session
ALTER TABLE "multiplayer"."coop_session" ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant isolation on coop_session
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'multiplayer' AND tablename = 'coop_session' 
    AND policyname = 'tenant_isolation_coop_session'
  ) THEN
    CREATE POLICY "tenant_isolation_coop_session" ON "multiplayer"."coop_session"
      FOR ALL
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

-- Enable RLS on coop_role_assignment
ALTER TABLE "multiplayer"."coop_role_assignment" ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant isolation on coop_role_assignment
-- Note: coop_role_assignment joins through coop_session to get tenant_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'multiplayer' AND tablename = 'coop_role_assignment' 
    AND policyname = 'tenant_isolation_coop_role_assignment'
  ) THEN
    CREATE POLICY "tenant_isolation_coop_role_assignment" ON "multiplayer"."coop_role_assignment"
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM "multiplayer"."coop_session" cs 
          WHERE cs."session_id" = "multiplayer"."coop_role_assignment"."session_id"
          AND (cs."tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM "multiplayer"."coop_session" cs 
          WHERE cs."session_id" = "multiplayer"."coop_role_assignment"."session_id"
          AND (cs."tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
        )
      );
  END IF;
END $$;

-- Enable RLS on coop_decision_proposal
ALTER TABLE "multiplayer"."coop_decision_proposal" ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant isolation on coop_decision_proposal
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'multiplayer' AND tablename = 'coop_decision_proposal' 
    AND policyname = 'tenant_isolation_coop_decision_proposal'
  ) THEN
    CREATE POLICY "tenant_isolation_coop_decision_proposal" ON "multiplayer"."coop_decision_proposal"
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM "multiplayer"."coop_session" cs 
          WHERE cs."session_id" = "multiplayer"."coop_decision_proposal"."session_id"
          AND (cs."tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM "multiplayer"."coop_session" cs 
          WHERE cs."session_id" = "multiplayer"."coop_decision_proposal"."session_id"
          AND (cs."tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
        )
      );
  END IF;
END $$;

-- Enable RLS on coop_incident_response
ALTER TABLE "multiplayer"."coop_incident_response" ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant isolation on coop_incident_response
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'multiplayer' AND tablename = 'coop_incident_response' 
    AND policyname = 'tenant_isolation_coop_incident_response'
  ) THEN
    CREATE POLICY "tenant_isolation_coop_incident_response" ON "multiplayer"."coop_incident_response"
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM "multiplayer"."coop_session" cs 
          WHERE cs."session_id" = "multiplayer"."coop_incident_response"."session_id"
          AND (cs."tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM "multiplayer"."coop_session" cs 
          WHERE cs."session_id" = "multiplayer"."coop_incident_response"."session_id"
          AND (cs."tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
        )
      );
  END IF;
END $$;