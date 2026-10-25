<script setup lang="ts">
// A component reaching into the application core: must be caught even inside a .vue file.
import { loadPreferences } from '../../../../../../../packages/application/src/index'
void loadPreferences
</script>
