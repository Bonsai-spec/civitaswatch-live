--
-- PostgreSQL database dump
--

\restrict tRncwMUb0jA7QMc51fCFN4YuBfDQybbV7h5BlGfNHuc4R1bBQTx9Kb7MzDOL0Uc

-- Dumped from database version 18.3 (Homebrew)
-- Dumped by pg_dump version 18.3 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: User; Type: TABLE; Schema: public; Owner: ATYOURFACESTUDIOPHOTOGRAPHY
--

CREATE TABLE public."User" (
    id text NOT NULL,
    "fullName" text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    role text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO "ATYOURFACESTUDIOPHOTOGRAPHY";

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: ATYOURFACESTUDIOPHOTOGRAPHY
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO "ATYOURFACESTUDIOPHOTOGRAPHY";

--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: ATYOURFACESTUDIOPHOTOGRAPHY
--

COPY public."User" (id, "fullName", email, "passwordHash", role, "isActive", "createdAt", "updatedAt") FROM stdin;
f6d28cef-7132-4a80-8d5f-2a844a442b01	Admin User	admin@civitaswatch.com	test123	ADMIN	t	2026-04-20 20:02:57.267	2026-04-20 20:02:57.267
903eb11e-62a5-46d3-81c4-0a9beded3abb	Control Room User	control@civitaswatch.com	$2b$10$6NbFdQMer7whMH45.Jjm0u1kz/upXj.FwXRcC8NziK3Z3saNAoHBW	CONTROL_ROOM	t	2026-04-20 20:42:30.413	2026-04-20 20:42:30.413
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: ATYOURFACESTUDIOPHOTOGRAPHY
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
363811aa-1ad3-4328-b4ee-d0cf6b3b95da	d817550e445e338fbe1bd5bfdf3634b0bb8aba92aa907c1229d645b3a7c46c35	2026-04-20 15:38:26.881553+02	20260420133826_init	\N	\N	2026-04-20 15:38:26.826033+02	1
\.


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: ATYOURFACESTUDIOPHOTOGRAPHY
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: ATYOURFACESTUDIOPHOTOGRAPHY
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: ATYOURFACESTUDIOPHOTOGRAPHY
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- PostgreSQL database dump complete
--

\unrestrict tRncwMUb0jA7QMc51fCFN4YuBfDQybbV7h5BlGfNHuc4R1bBQTx9Kb7MzDOL0Uc

