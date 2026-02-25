-- StackMemory Seed Data
-- Minimal test data for local development
-- Run after migrations are applied

-- ============================================
-- Test User Profile
-- ============================================
-- Default test user: 00000000-0000-0000-0000-000000000002

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = '00000000-0000-0000-0000-000000000002') THEN
        INSERT INTO profiles (id, username, avatar_url, settings)
        VALUES (
            '00000000-0000-0000-0000-000000000002', 
            'testuser', 
            NULL, 
            '{"theme": "light", "notifications": true}'::jsonb
        );
    END IF;
END $$;

-- ============================================
-- Tags
-- ============================================

DO $$
DECLARE
    v_tag_id UUID;
BEGIN
    -- Tag: JavaScript
    INSERT INTO tags (id, name, color, user_id)
    VALUES ('11111111-1111-1111-1111-111111111111', 'javascript', '#f7df1e', '00000000-0000-0000-0000-000000000002')
    ON CONFLICT DO NOTHING;

    -- Tag: TypeScript
    INSERT INTO tags (id, name, color, user_id)
    VALUES ('22222222-2222-2222-2222-222222222222', 'typescript', '#3178c6', '00000000-0000-0000-0000-000000000002')
    ON CONFLICT DO NOTHING;

    -- Tag: React
    INSERT INTO tags (id, name, color, user_id)
    VALUES ('33333333-3333-3333-3333-333333333333', 'react', '#61dafb', '00000000-0000-0000-0000-000000000002')
    ON CONFLICT DO NOTHING;

    -- Tag: Next.js
    INSERT INTO tags (id, name, color, user_id)
    VALUES ('44444444-4444-4444-4444-444444444444', 'nextjs', '#000000', '00000000-0000-0000-0000-000000000002')
    ON CONFLICT DO NOTHING;

    -- Tag: Database
    INSERT INTO tags (id, name, color, user_id)
    VALUES ('55555555-5555-5555-5555-555555555555', 'database', '#336791', '00000000-0000-0000-0000-000000000002')
    ON CONFLICT DO NOTHING;

    -- Tag: Algorithm
    INSERT INTO tags (id, name, color, user_id)
    VALUES ('66666666-6666-6666-6666-666666666666', 'algorithm', '#ff6b6b', '00000000-0000-0000-0000-000000000002')
    ON CONFLICT DO NOTHING;
END $$;

-- ============================================
-- Sample Flashcards
-- ============================================

DO $$
DECLARE
    v_card_id UUID;
BEGIN
    -- Card 1: JavaScript closure
    INSERT INTO flashcards (id, user_id, question, answer, code_snippet, source_url, source_title, difficulty, is_reviewed, review_count, created_at)
    VALUES (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '00000000-0000-0000-0000-000000000002',
        'What is a closure in JavaScript?',
        'A closure is a function that has access to variables from its outer (enclosing) scope, even after the outer function has returned.',
        'function outer() {
  let counter = 0;
  return function inner() {
    counter++;
    return counter;
  };
}
const fn = outer();
fn(); // 1
fn(); // 2',
        'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures',
        'MDN Closures',
        'medium',
        false,
        0,
        NOW() - INTERVAL '7 days'
    )
    ON CONFLICT DO NOTHING;

    -- Card 2: TypeScript generics
    INSERT INTO flashcards (id, user_id, question, answer, code_snippet, source_url, source_title, difficulty, is_reviewed, review_count, created_at)
    VALUES (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        '00000000-0000-0000-0000-000000000002',
        'What are TypeScript generics?',
        'Generics allow you to create reusable components that work with multiple types rather than a single one. They provide type safety without sacrificing flexibility.',
        'function identity<T>(arg: T): T {
  return arg;
}
const result = identity<string>("hello");
const num = identity<number>(42);',
        'https://www.typescriptlang.org/docs/handbook/2/generics.html',
        'TypeScript Generics',
        'medium',
        false,
        0,
        NOW() - INTERVAL '5 days'
    )
    ON CONFLICT DO NOTHING;

    -- Card 3: React useState
    INSERT INTO flashcards (id, user_id, question, answer, code_snippet, source_url, source_title, difficulty, is_reviewed, review_count, created_at)
    VALUES (
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        '00000000-0000-0000-0000-000000000002',
        'How does useState work in React?',
        'useState is a Hook that lets you add state to functional components. It returns an array with the current state value and a function to update it.',
        'import { useState } from ''react'';

function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  );
}',
        'https://react.dev/reference/react/useState',
        'React useState',
        'easy',
        true,
        2,
        NOW() - INTERVAL '3 days'
    )
    ON CONFLICT DO NOTHING;

    -- Card 4: SQL JOIN types
    INSERT INTO flashcards (id, user_id, question, answer, code_snippet, source_url, source_title, difficulty, is_reviewed, review_count, created_at)
    VALUES (
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        '00000000-0000-0000-0000-000000000002',
        'Explain SQL JOIN types',
        'INNER JOIN: returns matching rows from both tables
LEFT JOIN: returns all rows from left table + matching from right
RIGHT JOIN: returns all rows from right table + matching from left
FULL OUTER JOIN: returns all rows when there is a match in either table',
        'SELECT * FROM users u
INNER JOIN orders o ON u.id = o.user_id;

SELECT * FROM users u
LEFT JOIN orders o ON u.id = o.user_id;',
        'https://www.w3schools.com/sql/sql_join.asp',
        'SQL JOIN',
        'medium',
        false,
        0,
        NOW() - INTERVAL '2 days'
    )
    ON CONFLICT DO NOTHING;

    -- Card 5: Big O notation
    INSERT INTO flashcards (id, user_id, question, answer, code_snippet, source_url, source_title, difficulty, is_reviewed, review_count, created_at)
    VALUES (
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        '00000000-0000-0000-0000-000000000002',
        'What is Big O notation?',
        'Big O notation describes the upper bound of time complexity of an algorithm. Common complexities: O(1) - constant, O(log n) - logarithmic, O(n) - linear, O(n log n) - linearithmic, O(n²) - quadratic.',
        '// O(1) - constant
arr[0];

// O(n) - linear
for (let i = 0; i < n; i++) {}

// O(n²) - quadratic
for (let i = 0; i < n; i++) {
  for (let j = 0; j < n; j++) {}
}',
        'https://www.bigocheatsheet.com/',
        'Big O Cheat Sheet',
        'hard',
        false,
        0,
        NOW() - INTERVAL '1 day'
    )
    ON CONFLICT DO NOTHING;
END $$;

-- ============================================
-- Card-Tag Mappings
-- ============================================

DO $$
BEGIN
    -- Card 1: JavaScript closure -> javascript, algorithm
    INSERT INTO card_tags (card_id, tag_id)
    VALUES 
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111'),
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666')
    ON CONFLICT DO NOTHING;

    -- Card 2: TypeScript generics -> typescript
    INSERT INTO card_tags (card_id, tag_id)
    VALUES 
        ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222')
    ON CONFLICT DO NOTHING;

    -- Card 3: React useState -> react, javascript
    INSERT INTO card_tags (card_id, tag_id)
    VALUES 
        ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333'),
        ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111')
    ON CONFLICT DO NOTHING;

    -- Card 4: SQL JOIN -> database
    INSERT INTO card_tags (card_id, tag_id)
    VALUES 
        ('dddddddd-dddd-dddd-dddd-dddddddddddd', '55555555-5555-5555-5555-555555555555')
    ON CONFLICT DO NOTHING;

    -- Card 5: Big O -> algorithm
    INSERT INTO card_tags (card_id, tag_id)
    VALUES 
        ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '66666666-6666-6666-6666-666666666666')
    ON CONFLICT DO NOTHING;
END $$;

-- ============================================
-- Verification Query
-- ============================================

SELECT 'Seed data loaded successfully' AS status;

-- Show seeded data counts
SELECT 
    (SELECT COUNT(*) FROM profiles) AS profiles_count,
    (SELECT COUNT(*) FROM tags) AS tags_count,
    (SELECT COUNT(*) FROM flashcards) AS flashcards_count,
    (SELECT COUNT(*) FROM card_tags) AS card_tags_count,
    (SELECT COUNT(*) FROM routes) AS routes_count,
    (SELECT COUNT(*) FROM route_tasks) AS route_tasks_count;
