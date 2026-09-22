# Goal

This is enhancing/extending an existing feature:

It will provide a direct comparison of experience between traditional LLMs and System 1 models.

One query box with two buttons: "Ask an LLM" and "Ranked Recommendation"

(Both receive exactly the same candidate set, making the comparison meaningful)


(pin to typesafe/jev-1.13)
https://openrouter.ai/~typesafe/jev-latest

https://docs.typesafe.ai/primitives/score#structured-level-descriptions


Recommendations are not mutually exclusive: three links can all be excellent. Give each shortlisted link an independent relevance score with concrete levels such as:

1. Unrelated to the user’s goal.
2. Adjacent background material.
3. Directly useful.
4. Highly specific and immediately useful.

Then rank by expected score and return the top three above a threshold.

