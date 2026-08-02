"""Assemble index.html in the order the study actually reads.

The page had grown by addition: every new run became a new subsection, and the
theory that set them up sat in front of all of it. This puts the case and the
result first, keeps the operator family together, and moves the routes that add
transport the family does not contain into a section of their own at the end.

Sections held out of the family thread are listed in OTHER and appear under one
heading, so a reader can tell at a glance which results belong to which line of
work.
"""
import io
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

S = "parts/"
S15 = "parts/s15/"

# Held out of the page entirely. Each adds transport the local rules do not
# contain, so it answers a different question. The sources stay in parts/ so
# the work is not lost and can be put back by adding them to ORDER.
OTHER_BODY = [
    S15 + "06_15_6_the_pictures_against_the_numbers_ag.html",
    S15 + "08_15_8_where_the_cooling_actually_comes_fr.html",
    S15 + "10_15_10_letting_the_database_place_the_sha.html",
    S15 + "12_15_12_the_smallest_feature_the_replay_ca.html",
    S15 + "14_15_14_the_number_the_picture_and_whether.html",
    S15 + "09_15_9_the_curves_and_the_fields_not_just_.html",
    S15 + "07_15_7_measuring_the_texture_not_just_the_.html",
    S15 + "05_15_5_turning_the_same_test_around_and_gi.html",
    S15 + "11_15_11_the_base_of_the_layer_a_thickness_.html",
    S15 + "13_15_13_recording_the_transport_not_only_t.html",
    S15 + "15_15_15_what_happens_when_the_feedback_is_.html",
]

# the family thread, in reading order
ORDER = [
    S + "00_head.html",
    S + "01_1_background.html",
    S + "02_2_the_buoyant_jet_test_case.html",
    S + "03_3_rcfd_in_a_nutshell.html",
    S + "04_4_face_swap_diffusion.html",
    S + "05_5_step_1a_workflow_on_windows_11.html",
    S + "06_6_step_1b_the_parameter_sweep.html",
    S + "07_7_quantitative_results.html",
    S + "08_8_visual_comparison.html",
    S + "09_9_discussion.html",
    S + "10_10_the_heat_loss_model.html",
    S + "11_11_the_cfd_reference_with_heat_loss.html",
    S + "12_12_rcfd_vs_cfd_the_gap.html",
    S + "13_13_turning_the_dial_the_h_sweep.html",
    S + "14_14_does_local_diffusion_help.html",
    S15 + "00_intro.html",
    S15 + "01_15_1_how_the_heat_loss_database_is_built.html",
    S15 + "02_15_2_the_animation_against_the_number.html",
    S15 + "03_15_3_rebuilding_it_once_more_with_the_lo.html",
    S15 + "04_15_4_sharpening_on_the_recorded_cooling_.html",
    S + "new_16_sink_audit.html",
    S + "new_17_matched.html",
] + [
    S + "16_16_step_3_writing_finalization.html",
    S + "17_references.html",
]

OUT = "index.html"


def main():
    missing = [p for p in ORDER if not os.path.exists(p)]
    if missing:
        raise SystemExit("missing:\n  " + "\n  ".join(missing))

    io.open(OUT, "w", encoding="utf-8", errors="replace").write(
        "".join(io.open(p, encoding="utf-8", errors="replace").read()
                for p in ORDER))
    print("wrote %s from %d parts (%d of them under Other Work)"
          % (OUT, len(ORDER), len(OTHER_BODY)))


if __name__ == "__main__":
    main()
