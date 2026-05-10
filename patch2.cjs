const fs = require('fs');
let text = fs.readFileSync('src/components/portal/QuickActions.tsx', 'utf8');

// 1. Add Import
text = text.replace('import { cn } from \'@/lib/utils\';', 'import { cn } from \'@/lib/utils\';\nimport { PolymartServiceModal } from \'./PolymartServiceModal\';');

// 2. Add useState
text = text.replace('import React from \'react\';', 'import React, { useState } from \'react\';');

// 3. Add state and modal to component
text = text.replace('  const navigate = useNavigate();\r\n\r\n  return (\r\n    <motion.div', '  const navigate = useNavigate();\r\n  const [showPolymartModal, setShowPolymartModal] = useState(false);\r\n\r\n  return (\r\n    <>\r\n      <PolymartServiceModal isOpen={showPolymartModal} onClose={() => setShowPolymartModal(false)} />\r\n      <motion.div');

// 3a. Fallback for LF
text = text.replace('  const navigate = useNavigate();\n\n  return (\n    <motion.div', '  const navigate = useNavigate();\n  const [showPolymartModal, setShowPolymartModal] = useState(false);\n\n  return (\n    <>\n      <PolymartServiceModal isOpen={showPolymartModal} onClose={() => setShowPolymartModal(false)} />\n      <motion.div');

// 4. Update PolyMart onClick
text = text.replace('navigate(\'/polymart\');', 'setShowPolymartModal(true);');

// 5. Add closing tag
text = text.replace('    </motion.div>\r\n  );\r\n}', '    </motion.div>\r\n    </>\r\n  );\r\n}');

// 5a. Fallback for LF
text = text.replace('    </motion.div>\n  );\n}', '    </motion.div>\n    </>\n  );\n}');

fs.writeFileSync('src/components/portal/QuickActions.tsx', text);
console.log("Patched QuickActions.tsx");
