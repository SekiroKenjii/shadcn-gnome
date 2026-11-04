# shellcheck shell=bash
# shellcheck disable=SC2034  # consumed by the components that source this file

readonly CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
readonly DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
readonly STATE_HOME="${XDG_STATE_HOME:-$HOME/.local/state}"

readonly STATE_DIR="$STATE_HOME/shadcn-gnome"
readonly ICONS_DIR="$DATA_HOME/icons"
readonly FONTS_DIR="$DATA_HOME/fonts/geist"
readonly BACKGROUNDS_DIR="$DATA_HOME/backgrounds/shadcn-gnome"
readonly BACKGROUND_PROPERTIES_DIR="$DATA_HOME/gnome-background-properties"
readonly EXTENSIONS_DIR="$DATA_HOME/gnome-shell/extensions"
readonly PTYXIS_PALETTES_DIR="$DATA_HOME/org.gnome.Ptyxis/palettes"
readonly APPLICATIONS_DIR="$DATA_HOME/applications"
readonly VITALS_DIR="$EXTENSIONS_DIR/Vitals@CoreCoding.com"

readonly GENERATED_MARKER="shadcn-gnome"
