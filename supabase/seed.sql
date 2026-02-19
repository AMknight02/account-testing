-- ============================================
-- Seed data: HER edition questions (Q1-Q4)
-- Run this AFTER migration.sql in Supabase SQL Editor
-- ============================================

-- Q1 | light | Dressed For Him
do $$
declare q_id uuid;
begin
  insert into public.questions (edition, order_num, intensity, intensity_emoji, title, scenario)
  values (
    'her', 1, 'light', '🟣', 'Dressed For Him',
    'He lays out an outfit on the bed before you get home — a matching lingerie set, thigh-highs, and heels. A note reads: "Wear this. Nothing else underneath. Be ready when I walk in." You have 20 minutes.'
  ) returning id into q_id;

  insert into public.question_options (question_id, label, option_text, is_other, order_num) values
    (q_id, 'A', 'I put every piece on slowly, feeling myself transform into what he wants. By the time he walks in, I''m already wet from the anticipation', false, 1),
    (q_id, 'B', 'I''d wear it but leave one piece off — let him discover what''s missing and see if he has the nerve to correct me', false, 2),
    (q_id, 'C', 'I''d text him a photo of me in it and say: "Now lay out what you''re wearing for me. Fair''s fair."', false, 3),
    (q_id, 'D', 'I''d wear everything he chose, then add a surprise he didn''t plan — a body chain, a garter — something that says I''m his but I''m still full of surprises', false, 4),
    (q_id, 'E', 'Other', true, 5);
end $$;

-- Q2 | light | His Hands On You
do $$
declare q_id uuid;
begin
  insert into public.questions (edition, order_num, intensity, intensity_emoji, title, scenario)
  values (
    'her', 2, 'light', '🟣', 'His Hands On You',
    'You''re making out on the couch. He takes your hand and places it on his cock, hard through his jeans. Then he slides his own hand between your thighs and starts touching you exactly the way he wants — his pace, his pressure, his rhythm. He''s not asking what you like. He''s deciding.'
  ) returning id into q_id;

  insert into public.question_options (question_id, label, option_text, is_other, order_num) values
    (q_id, 'A', 'I open my legs wider and let him explore. Him taking ownership of my pleasure without asking is intoxicating', false, 1),
    (q_id, 'B', 'I''d move his hand away, climb on top of him, and grind against him at my pace — I set the rhythm', false, 2),
    (q_id, 'C', 'I''d let him lead for a while, then guide his fingers exactly where I need them and whisper "right there"', false, 3),
    (q_id, 'D', 'I''d squeeze him through his jeans and match his energy — if he''s going to take, so am I', false, 4),
    (q_id, 'E', 'Other', true, 5);
end $$;

-- Q3 | light | The Tease
do $$
declare q_id uuid;
begin
  insert into public.questions (edition, order_num, intensity, intensity_emoji, title, scenario)
  values (
    'her', 3, 'light', '🟣', 'The Tease',
    'He pushes you against the kitchen counter, drops to his knees, and starts kissing your inner thighs — slowly, deliberately. His mouth gets close to your pussy but never touches it. Every time your hips shift toward him, he pulls back and whispers "not yet."'
  ) returning id into q_id;

  insert into public.question_options (question_id, label, option_text, is_other, order_num) values
    (q_id, 'A', 'The denial makes me desperate. I''d whimper and beg him to taste me', false, 1),
    (q_id, 'B', 'I''d grab his hair and push his face exactly where I want it — no more teasing', false, 2),
    (q_id, 'C', 'I''d endure it until I can''t, then pull him up and push him against the counter instead', false, 3),
    (q_id, 'D', 'I''d let him set the pace. The longer he makes me wait, the harder I''ll come', false, 4),
    (q_id, 'E', 'Other', true, 5);
end $$;

-- Q4 | light | Mirror Show
do $$
declare q_id uuid;
begin
  insert into public.questions (edition, order_num, intensity, intensity_emoji, title, scenario)
  values (
    'her', 4, 'light', '🟣', 'Mirror Show',
    'He positions you in front of a full-length mirror in nothing but heels. He stands behind you, fully clothed, and says: "Watch yourself while I touch you. Don''t close your eyes." His hands start at your neck and move slowly down your breasts, your stomach, lower.'
  ) returning id into q_id;

  insert into public.question_options (question_id, label, option_text, is_other, order_num) values
    (q_id, 'A', 'Watching my own body respond to his hands — my nipples hardening, my breath changing — the vulnerability is overwhelming and addictive', false, 1),
    (q_id, 'B', 'I''d turn around, unbutton his shirt, and make him strip while I watch. He doesn''t get to stay clothed while I''m exposed', false, 2),
    (q_id, 'C', 'I''d reach back and grab him through his pants while watching us both in the mirror — making it mutual', false, 3),
    (q_id, 'D', 'I''d keep my eyes open like he asked, letting him see every reaction on my face. Giving him that visual is my gift', false, 4),
    (q_id, 'E', 'Other', true, 5);
end $$;
