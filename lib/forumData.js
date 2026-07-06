// Forum thread data + deterministic mock comments (shared by the forum list and
// the post detail page). Static — Phase 1 has no backend.

// The signed-in user (mocked for Phase 1). "Your" posts/comments notify you.
export const ME = "u/you";
// Posts considered authored by the current user (drives "commented on your post").
export const MY_POST_IDS = [5];

export const THREADS = [
  { id: 1, community: "w/Protectors", color: "#ffd23f", author: "u/mayaokafor", time: "3h", title: "Great power, great responsibility — my abuela said it before the movies did.", body: "She's been saying it my whole life. Watching the new film, it finally clicked why she never let me forget it. Anyone else have someone who taught them this before they understood it?", votes: 4200, comments: "312", tag: "Trending", hot: 98, top: 4200, hasImage: false },
  { id: 2, community: "w/Dreamers", color: "#ff5a6a", author: "u/leomartins", time: "5h", title: "First time seeing someone like me on the poster. Suited up and didn't take it off all day.", body: "Anyone can wear the mask. I never believed that until this week. Now I can't unsee it — every kid on my street feels like they could be next.", votes: 2400, comments: "182", tag: "Hot", hot: 95, top: 2400, hasImage: true, slotId: "f-2" },
  { id: 3, community: "w/Rebels", color: "#4d8bff", author: "u/graceliu", time: "8h", title: "Everyone kept telling me who Spider-Man should be. So I drew who he is to ME.", body: "Dropped the full sketchbook below. Not everyone swings the same way — and that's exactly the point of this whole thing.", votes: 2100, comments: "168", tag: "Art", hot: 90, top: 2100, hasImage: true, slotId: "f-3" },
  { id: 4, community: "w/SpideySpotted", color: "#ff9f43", author: "u/diegoalvarez", time: "11h", title: "Spotted a web-tag on 7th street this morning. Anyone else seeing these pop up?", body: "Third one this week in my neighbourhood. Someone's leaving marks all over the city. Started a map — link in comments. Add yours if you find one.", votes: 1900, comments: "204", tag: "Sighting", hot: 88, top: 1900, hasImage: false },
  { id: 5, community: "w/Prodigies", color: "#7ee787", author: "u/priyanair", time: "14h", title: "Built a working web-shooter for my little brother's birthday.", body: "He hasn't stopped swinging around the house since. Parts list and 3D files in the comments for anyone who wants to build one.", votes: 1500, comments: "96", tag: "Build", hot: 84, top: 1500, hasImage: true, slotId: "f-5" },
  { id: 6, community: "w/Dreamers", color: "#ff5a6a", author: "u/samwhitfield", time: "1d", title: "Told my whole class that anyone can wear the mask. Then I showed them mine.", body: "Bravest thing I've done all year. Half of them want to make their own now. Teacher's letting us do a wall.", votes: 1200, comments: "120", tag: "Story", hot: 80, top: 1200, hasImage: false },
  { id: 7, community: "w/Protectors", color: "#ffd23f", author: "u/aishabello", time: "1d", title: "Cosplayed at the premiere with my whole crew. Six spiders, one city.", body: "We spent a month on the suits. Worth every late night. Group shot inside — swipe for the behind-the-scenes.", votes: 980, comments: "88", tag: "Cosplay", hot: 76, top: 980, hasImage: true, slotId: "f-7" },
  { id: 8, community: "w/Rebels", color: "#4d8bff", author: "u/hanakim", time: "2d", title: "Painted the mask my way. Not everyone swings the same.", body: "Went with a completely different palette. Got some heat for it but I think that's kind of the point.", votes: 760, comments: "54", tag: "Art", hot: 70, top: 760, hasImage: false },
  { id: 9, community: "w/Prodigies", color: "#7ee787", author: "u/tomassilva", time: "2d", title: "Coded a little web-swing game over the weekend.", body: "It's rough, but it's mine. Play it in the browser — link inside. Would love feedback from the Web.", votes: 540, comments: "41", tag: "Build", hot: 62, top: 540, hasImage: false },
];

export function getThread(id) {
  return THREADS.find((t) => String(t.id) === String(id));
}

const C_AUTHORS = ["u/webhead", "u/nightmonkey", "u/queensfinest", "u/thwip_thwip", "u/aunt_may", "u/miles_g", "u/gwen_s", "u/harry_o"];
const C_BODIES = [
  "This hit me right in the feels. Thanks for sharing this with the Web.",
  "Okay but this is EXACTLY what the new movie gets right.",
  "Saving this thread — my whole group needs to see it.",
  "Not everyone swings the same, and that's the best part of all this.",
  "Read this three times and it still gives me chills.",
  "The Web really does show up when you need it most.",
  "Adding my voice: you are not alone out there.",
  "This is the kind of story that keeps me coming back here every day.",
];

// Deterministic comments (SSR/CSR-stable) so no hydration mismatch.
export function commentsFor(thread) {
  if (!thread) return [];
  const n = 3 + (thread.id % 3); // 3–5 comments
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (thread.id * 7 + i * 3) % C_AUTHORS.length;
    const b = (thread.id * 5 + i * 4) % C_BODIES.length;
    out.push({
      id: i,
      author: C_AUTHORS[a],
      time: (i + 1) + "h",
      body: C_BODIES[b],
      votes: Math.max(2, 46 - i * 9 - (thread.id % 5) * 3),
    });
  }
  return out;
}
